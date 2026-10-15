
pipeline {
    agent { label 'windows' }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                echo 'Source code downloaded successfully.'
            }
        }

        stage('Check Project Files') {
            steps {
                bat 'dir'
                bat 'docker --version'
                bat 'docker compose version'
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
    }

    post {
        success {
            echo 'Civic Issue images built and pushed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}