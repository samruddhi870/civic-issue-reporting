pipeline {
    agent any

    environment {
        BACKEND_IMAGE  = 'samruddhi870/civic-issue-backendd'
        FRONTEND_IMAGE = 'samruddhi870/civic-issue-frontendd'
        // kubectl uses the jenkins user's ~/.kube/config (minikube must be started AS jenkins)
    }

    options { timestamps() }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Backend Build & Test') {
            // Builds deps, seeds a fresh DB, runs pytest inside the image build.
            steps { sh 'docker build --target test -t civic-backend-test:$BUILD_NUMBER backend' }
        }

        stage('Docker Build') {
            // Frontend image build runs "npm ci && npm run build" (build test).
            steps {
                sh '''
                    docker build -t "$BACKEND_IMAGE:$BUILD_NUMBER"  -t "$BACKEND_IMAGE:latest"  backend
                    docker build -t "$FRONTEND_IMAGE:$BUILD_NUMBER" -t "$FRONTEND_IMAGE:latest" frontend
                '''
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_TOKEN')]) {
                    sh '''
                        echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                        docker push "$BACKEND_IMAGE:$BUILD_NUMBER"
                        docker push "$BACKEND_IMAGE:latest"
                        docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                        docker push "$FRONTEND_IMAGE:latest"
                        docker logout
                    '''
                }
            }
        }

        stage('Minikube Deployment') {
            steps {
                sh '''
                    kubectl cluster-info
                    # Deploy the exact build-number tag (not :latest) so each run is a visible new rollout
                    sed "s|image: .*|image: $BACKEND_IMAGE:$BUILD_NUMBER|"  k8s/backend-deployment.yaml  | kubectl apply -f -
                    sed "s|image: .*|image: $FRONTEND_IMAGE:$BUILD_NUMBER|" k8s/frontend-deployment.yaml | kubectl apply -f -
                    kubectl apply -f k8s/backend-service.yaml
                    kubectl apply -f k8s/frontend-service.yaml
                    kubectl rollout status deployment/backend-deployment  --timeout=240s
                    kubectl rollout status deployment/frontend-deployment --timeout=240s
                '''
            }
        }

        stage('Verification') {
            steps {
                sh '''
                    kubectl get deployments
                    kubectl get pods -o wide
                    kubectl get services
                    kubectl get deployment backend-deployment  -o jsonpath='backend image:  {.spec.template.spec.containers[0].image}{"\\n"}'
                    kubectl get deployment frontend-deployment -o jsonpath='frontend image: {.spec.template.spec.containers[0].image}{"\\n"}'

                    # Smoke test through the frontend service (nginx -> backend-service)
                    kubectl port-forward svc/frontend-service 18080:80 >/dev/null 2>&1 &
                    PF=$!
                    sleep 6
                    curl -fsS http://localhost:18080/ >/dev/null && echo "FRONTEND OK"
                    curl -fsS http://localhost:18080/api/health && echo
                    kill $PF || true
                '''
            }
        }
    }

    post {
        always  { sh 'docker logout >/dev/null 2>&1 || true' }
        failure { sh 'kubectl get pods 2>/dev/null || true' }
    }
}
