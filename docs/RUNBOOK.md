# CivicConnect CI/CD Runbook (GitHub -> Jenkins -> Docker Hub -> Minikube)

```
 git push ──> GitHub ──> Jenkins (AWS EC2)
                           │ 1 Checkout
                           │ 2 Backend Build & Test   (docker build --target test: seed DB + pytest)
                           │ 3 Docker Build           (backend + frontend, tag = BUILD_NUMBER)
                           │ 4 Push Image             (Docker Hub, creds: dockerhub-creds)
                           │ 5 Minikube Deployment    (kubectl apply k8s/ + rollout status)
                           └ 6 Verification           (pods/svc + curl via port-forward)
```

## Why the pipeline failed (root causes fixed)
1. Tests need seeded users/issues; `civicconnect.db` is gitignored -> fresh checkout had none -> pytest failed. Test stage now runs `seed.py` first.
2. Bind-mount (`-v $WORKSPACE:/app`) breaks when Jenkins itself runs in a container. Tests now run inside `docker build`.
3. Deployed pods had an empty DB (no logins). `entrypoint.sh` seeds on first start only (`seed.py` drops all tables).
4. Frontend Service was ClusterIP -> unreachable. Now NodePort 30080.
5. `KUBECONFIG=/home/ubuntu/...` is unreadable by the `jenkins` user (cert path permission denied). Minikube now runs as `jenkins`.

## One-time AWS server setup (Ubuntu, t3.medium+, 20 GB disk)
1. Open Security Group ports: 22, 8080 (Jenkins), 8081 (app demo).
2. Install tools: `sudo apt update && sudo apt install -y docker.io curl git openjdk-17-jre`
3. Install Jenkins (official apt repo), then `sudo systemctl enable --now jenkins docker`.
4. Install kubectl and minikube (official binaries into /usr/local/bin).
5. `sudo usermod -aG docker jenkins && sudo usermod -aG docker ubuntu`
6. `sudo systemctl restart jenkins`
7. Start minikube AS jenkins: `sudo -u jenkins -H minikube start --driver=docker`
8. Check: `sudo -u jenkins -H kubectl get nodes` shows `Ready`.

## Jenkins setup
1. Manage Jenkins > Credentials > Add: Username with password, ID `dockerhub-creds` (user `samruddhi870`, password = Docker Hub access token).
2. New Item > Pipeline > "Pipeline script from SCM" > Git > `https://github.com/samruddhi870/civic-issue-reporting.git`, branch `main`, Script Path `Jenkinsfile`.
3. Build Now. Expect all 6 stages green.

## Open the app
1. On the server: `kubectl port-forward --address 0.0.0.0 svc/frontend-service 8081:80`
2. Browser: `http://<EC2-public-IP>:8081`  (login: see seed.py users)

## Re-run with a code change (required demo)
1. Edit `backend/app.py`: change `"version": "1.0.0"` to `"1.1.0"`.
2. `git add . && git commit -m "bump version" && git push`
3. Jenkins > Build Now (build number increments).
4. Show: `kubectl get deployment backend-deployment -o jsonpath='{.spec.template.spec.containers[0].image}'` -> new tag, and `curl http://localhost:8081/api/health` -> version 1.1.0.
5. Show history: `kubectl rollout history deployment/backend-deployment`

## Common errors
- `permission denied ... docker.sock` -> step 5 + restart Jenkins.
- `Unable to connect to the server` / cert permission denied -> minikube not started as jenkins (step 7).
- `denied: requested access to the resource is denied` -> wrong Docker Hub token/username in `dockerhub-creds`.
- Pod `ImagePullBackOff` -> image name in Jenkinsfile must match a repo you can push to.
