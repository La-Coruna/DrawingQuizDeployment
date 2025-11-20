pipeline {
    agent any

    environment {
        APP_REPO = "https://github.com/La-Coruna/DrawingQuizDeployment.git"
        INFRA_REPO = "https://github.com/La-Coruna/DrawingQuiz-Infra.git"   // 🚀 GitOps Manifest Repo
        REGISTRY = "docker.io/lacoruna/drawingquiz"
    }

    stages {

        stage('Checkout App Repo') {
            when {
                changeset "${APP_REPO}" 
            }
            steps {
                git branch: 'main', url: "${APP_REPO}"
            }
        }

        stage('Determine Image Tag') {
            steps {
                script {
                    TAG = sh(script: "git rev-parse --short HEAD", returnStdout: true).trim()
                    IMAGE = "${REGISTRY}:${TAG}"
                    echo "Image Tag: ${IMAGE}"
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                docker build -t ${IMAGE} .
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
                    docker push ${IMAGE}
                    """
                }
            }
        }

        stage('Update Manifest Repo') {
            steps {
                dir('infra') {

                    deleteDir()

                    withCredentials([usernamePassword(
                        credentialsId: 'github-token',
                        usernameVariable: 'GH_USER',
                        passwordVariable: 'GH_TOKEN'
                    )]) {
                        sh """
                        git clone https://${GH_USER}:${GH_TOKEN}@github.com/La-Coruna/DrawingQuiz-Infra.git .
                        """
                    }

                    // 🔥 정확한 파일명 + 이미지 경로로 치환
                    sh """
                    sed -i "s#image: .*drawingquiz:.*#image: ${IMAGE}#" app/django-deployment.yaml
                    """

                    withCredentials([usernamePassword(
                        credentialsId: 'github-token',
                        usernameVariable: 'GH_USER',
                        passwordVariable: 'GH_TOKEN'
                    )]) {
                        sh """
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins CI"

                        git add .
                        git commit -m "Update image to ${IMAGE}" || echo "No changes to commit"

                        git push https://${GH_USER}:${GH_TOKEN}@github.com/La-Coruna/DrawingQuiz-Infra.git main
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Docker Build, Push, GitOps Repo Update 완료!"
        }
        failure {
            echo "❌ Build Failed!"
        }
    }
}
