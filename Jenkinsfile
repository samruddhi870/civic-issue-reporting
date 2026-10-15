

pipeline {
    agent { label 'windows' }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                echo 'Source code downloaded successfully.'
            }
        }

        stage('Test Source Code') {
            steps {
                bat 'python -m compileall -q backend'
                bat 'npm --prefix frontend ci'
                bat 'npm --prefix frontend run build'
            }
        }

        stage('Check Project Files') {
            steps {
                bat 'dir'
                bat 'docker --version'
                bat 'docker compose version'
                bat 'kubectl version --client'
            }
        }

        stage('Build Backend Image') {
            steps {
                bat 'docker build -t civic-issue-backend:latest ./backend'
                bat 'docker tag civic-issue-backend:latest samruddhi870/civic-issue-backend:latest'
            }
        }

        stage('Build Frontend Image') {
            steps {
                bat 'docker build -t civic-issue-frontend:latest ./frontend'
                bat 'docker tag civic-issue-frontend:latest samruddhi870/civic-issue-frontend:latest'
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKERHUB_USER',
                    passwordVariable: 'DOCKERHUB_TOKEN'
                )]) {
                    bat 'echo %DOCKERHUB_TOKEN% | docker login -u %DOCKERHUB_USER% --password-stdin'
                    bat 'docker push samruddhi870/civic-issue-backend:latest'
                    bat 'docker push samruddhi870/civic-issue-frontend:latest'
                    bat 'docker logout'
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat 'kubectl apply -f k8s'
                bat 'kubectl rollout restart deployment/civic-backend'
                bat 'kubectl rollout restart deployment/civic-frontend'
                bat 'kubectl rollout status deployment/civic-backend --timeout=180s'
                bat 'kubectl rollout status deployment/civic-frontend --timeout=180s'
            }
        }

        stage('Verify Kubernetes') {
            steps {
                bat 'kubectl get deployments'
                bat 'kubectl get pods'
                bat 'kubectl get services'
            }
        }
    }

    post {
        success {
            echo 'Build, tests, Docker push and Kubernetes deployment completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check Console Output for the first error.'
        }
    }
}