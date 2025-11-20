pipeline {
    agent any

    environment {
        REGISTRY = "docker.io/lacoruna/drawingquiz"
        TAG = "latest"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main', url: 'https://github.com/La-Coruna/DrawingQuizDeployment.git'
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                docker build -t $REGISTRY:$TAG .
                """
            }
        }

        stage('Docker Login & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',
                    usernameVariable: 'USER',
                    passwordVariable: 'PASS'
                )]) {
                    sh """
                    echo $PASS | docker login -u $USER --password-stdin
                    docker push $REGISTRY:$TAG
                    """
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Docker Image Build & Push Success!"
        }
        failure {
            echo "❌ Build Failed!"
        }
    }
}
