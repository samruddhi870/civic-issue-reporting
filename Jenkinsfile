pipeline {
    agent any

    environment {
        BACKEND_IMAGE = 'samruddhi870/civic-issue-backendd'
        FRONTEND_IMAGE = 'samruddhi870/civic-issue-frontendd'
        KUBECONFIG = '/home/ubuntu/.kube/config'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Tests') {
            steps {
                sh '''
                    docker run --rm \
                      -v "$WORKSPACE/backend:/app" \
                      -w /app \
                      python:3.11-slim \
                      sh -c 'pip install --no-cache-dir -r requirements.txt pytest && pytest -q'
                '''
            }
        }

        stage('Frontend Build Test') {
            steps {
                sh '''
                    docker run --rm \
                      -v "$WORKSPACE/frontend:/app" \
                      -w /app \
                      node:20-alpine \
                      sh -c 'npm ci && npm run build'
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build -t "$BACKEND_IMAGE:$BUILD_NUMBER" -t "$BACKEND_IMAGE:latest" backend
                    docker build -t "$FRONTEND_IMAGE:$BUILD_NUMBER" -t "$FRONTEND_IMAGE:latest" frontend
                '''
            }
        }

        stage('Push Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKERHUB_USER',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    sh '''
                        set +x
                        echo "$DOCKERHUB_TOKEN" |
                          docker login -u "$DOCKERHUB_USER" --password-stdin

                        docker push "$BACKEND_IMAGE:$BUILD_NUMBER"
                        docker push "$BACKEND_IMAGE:latest"
                        docker push "$FRONTEND_IMAGE:$BUILD_NUMBER"
                        docker push "$FRONTEND_IMAGE:latest"
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/backend-service.yaml
                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl apply -f k8s/frontend-service.yaml

                    kubectl set image deployment/backend-deployment \
                      backend="$BACKEND_IMAGE:$BUILD_NUMBER"

                    kubectl set image deployment/frontend-deployment \
                      frontend="$FRONTEND_IMAGE:$BUILD_NUMBER"

                    kubectl rollout status deployment/backend-deployment --timeout=180s
                    kubectl rollout status deployment/frontend-deployment --timeout=180s
                '''
            }
        }

        stage('Verify Deployment') {
            steps {
                sh '''
                    kubectl get deployments
                    kubectl get pods
                    kubectl get services
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout >/dev/null 2>&1 || true'
        }
    }
}