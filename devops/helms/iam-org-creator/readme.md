# Additional notes:

- iam-org-creator namespace was created manually
- iam-org-creator-secret was created manually (in the future to be replaced by Vault plugin)

# CD is managed by ArgoCD:

- Sync is set to automatic - any changes to values.yaml are automatically fetched to k8s

# CI/CD workflow for dev:

- Once there is a merge to develop -> sync is automatic (container is deployed to ecr and then to k8s)

# For the future:

- Access to ArgoCD project
