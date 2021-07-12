# Additional notes:

- iam-org-creator namespace was created manually
- iam-org-creator-secret was created manually (in the future to be replaced by Vault plugin)

# CD is managed by ArgoCD:

- Sync is set to automatic - any changes to values.yaml are automatically fetched to k8s

# CI/CD workflow for dev:

- Make a PR from feature branch to develop branch - it triggers ci.yml
- After merged to develop branch, add tags (x.x.x-dev e.g. 1.0.0-dev) -> this triggers ECR deployment process of container
- Once container is deployed, you could change tag in values.yaml (image.tag) -> once commited argo will rebuild application with new image tag

# For the future:

- Access to ArgoCD project
