
pipeline {
    agent { label 'windows' }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
                echo 'Civic Issue source code downloaded successfully.'
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
            }
        }

        stage('Build Frontend Image') {
            steps {
                bat 'docker build -t civic-issue-frontend:latest ./frontend'
            }
        }
    }

    post {
        success {
            echo 'Civic Issue pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs for the error.'
        }
    }
}