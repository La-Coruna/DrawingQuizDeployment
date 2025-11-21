pipeline {
    agent any

    environment {
        // 🔥 너의 정보
        DOCKERHUB_ID   = 'lacoruna'
        IMAGE_NAME     = 'drawingquiz'
        IMAGE_TAG      = "build-${env.BUILD_NUMBER}"

        // 🔥 GitOps Manifest Repo (HTTPS 사용)
        MANIFEST_REPO  = "https://github.com/La-Coruna/DrawingQuiz-Infra.git"
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Set up Python & Collect static') {
            steps {
                sh """
                python3 -m venv venv
                . venv/bin/activate
                pip install --no-cache-dir -r requirements.txt
                python manage.py collectstatic --noinput
                """
            }
        }

        stage('Docker Build') {
            steps {
                sh """
                docker build -t ${DOCKERHUB_ID}/${IMAGE_NAME}:${IMAGE_TAG} .
                docker tag ${DOCKERHUB_ID}/${IMAGE_NAME}:${IMAGE_TAG} ${DOCKERHUB_ID}/${IMAGE_NAME}:latest
                """
            }
        }

        stage('DockerHub Login & Push') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub',       // 🔥 DockerHub 크리덴셜
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                    echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                    docker push ${DOCKERHUB_ID}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${DOCKERHUB_ID}/${IMAGE_NAME}:latest
                    """
                }
            }
        }

        stage('Cleanup Local Images') {
            steps {
                sh """
                docker rmi ${DOCKERHUB_ID}/${IMAGE_NAME}:${IMAGE_TAG} || true
                docker rmi ${DOCKERHUB_ID}/${IMAGE_NAME}:latest || true
                """
            }
        }

        stage('Update K8S Manifest Repo') {
            steps {
                dir('infra-repo') {
                    deleteDir()

                    // 🔥 GitHub Token 인증을 통한 clone
                    withCredentials([usernamePassword(
                        credentialsId: 'github-token', // 🔥 GitHub PAT 저장한 Jenkins Credential ID
                        usernameVariable: 'GH_USER',
                        passwordVariable: 'GH_TOKEN'
                    )]) {

                        sh """
                        git clone https://${GH_USER}:${GH_TOKEN}@github.com/La-Coruna/DrawingQuiz-Infra.git .
                        """

                        // 🔥 이미지 태그 치환
                        sh """
                        sed -i "s|image:.*drawingquiz.*|image: ${DOCKERHUB_ID}/${IMAGE_NAME}:${IMAGE_TAG}|g" app/django-deployment.yaml
                        """


                        // 🔥 Git config 설정
                        sh """
                        git config user.email "jenkins@ci.com"
                        git config user.name "Jenkins CI"
                        """

                        // 🔥 Commit & Push
                        sh """
                        git add app/django-deployment.yaml
                        git commit -m "Update image tag to ${IMAGE_TAG}" || echo "No changes to commit"

                        git push https://${GH_USER}:${GH_TOKEN}@github.com/La-Coruna/DrawingQuiz-Infra.git main
                        """
                    }
                }
            }
        }
    }

    post {
        success { echo "🎉 SUCCESS: Build + Image Push + Manifest Updated" }
        failure { echo "❌ BUILD FAILED" }
    }
}
