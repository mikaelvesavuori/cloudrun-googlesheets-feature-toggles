gcloud beta run services delete $RUN_SERVICE_NAME --region $LOCATION --platform managed

gcloud beta artifacts repositories delete $REPO_NAME --location $LOCATION

gcloud source repos delete $REPO_NAME

gcloud beta builds triggers delete $REPO_NAME

gcloud beta secrets delete $SECRET_NAME_SERVICE_ACCOUNT_EMAIL
gcloud beta secrets delete $SECRET_NAME_PRIVATE_KEY

echo "Make sure to delete all of your storage buckets as well!"