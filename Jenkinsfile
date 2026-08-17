pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_USER = 'itsharshpaliwal'

        BACKEND_IMAGE = 'itsharshpaliwal/ai-devops-backend'
        FRONTEND_IMAGE = 'itsharshpaliwal/ai-devops-frontend'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Set Image Tag') {
            steps {
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    echo "Using image tag: ${env.IMAGE_TAG}"
                }
            }
        }

        stage('Backend Test') {
            steps {
                sh '''
                    python3 -m venv /tmp/ai-devops-venv
                    /tmp/ai-devops-venv/bin/pip install --upgrade pip
                    /tmp/ai-devops-venv/bin/pip install -r backend/requirements.txt

                    if [ -d backend/tests ]; then
                        /tmp/ai-devops-venv/bin/pytest backend/tests
                    else
                        echo "No backend tests directory found - skipping tests"
                    fi
                '''
            }
        }

        stage('Frontend Test') {
            steps {
                sh '''
                    cd frontend
                    npm ci

                    if npm run | grep -q "test"; then
                        npm test -- --watch=false
                    else
                        echo "No frontend test script found - skipping tests"
                    fi
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker build \
                      -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                      ./backend

                    docker build \
                      --build-arg NEXT_PUBLIC_API_BASE_URL=http://40.115.217.22:32457 \
                      -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                      ./frontend
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login \
                          -u "$DOCKER_USERNAME" \
                          --password-stdin

                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}

                        docker logout
                    '''
                }
            }
        }

        stage('Update Kubernetes Manifests') {
            steps {
                sh '''
                    sed -i "s#image: ${BACKEND_IMAGE}:.*#image: ${BACKEND_IMAGE}:${IMAGE_TAG}#" \
                      k8s/backend.yaml

                    sed -i "s#image: ${FRONTEND_IMAGE}:.*#image: ${FRONTEND_IMAGE}:${IMAGE_TAG}#" \
                      k8s/frontend.yaml

                    echo "Updated Kubernetes manifests:"
                    grep "image:" k8s/backend.yaml
                    grep "image:" k8s/frontend.yaml
                '''
            }
        }

        stage('Commit GitOps Changes') {
            steps {
                sh '''
                    git config user.name "Jenkins"
                    git config user.email "jenkins@localhost"

                    git add k8s/backend.yaml k8s/frontend.yaml

                    if git diff --cached --quiet; then
                        echo "No Kubernetes manifest changes"
                    else
                        git commit -m "chore: deploy ${IMAGE_TAG}"
                        git push origin HEAD:main
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "CI/CD pipeline completed successfully."
            echo "Argo CD should now synchronize the new Kubernetes images."
        }

        failure {
            echo "CI/CD pipeline failed."
        }
    }
}
