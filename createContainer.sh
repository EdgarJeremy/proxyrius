#/bin/bash

# Command : ./createContainer.sh $repo_url $repo_name $branch_name
# Output : IP address of newly created container

# $1 = Repository URL
# $2 = Repository Name
# $3 = Branch Name

rep_url=$1
rep_name=$2
branch_name=$3

clone_folder=$rep_name.$branch_name
docker_name=$clone_folder

cd ./pr
git clone --single-branch --branch $branch_name $rep_url $clone_folder >/dev/null 2>&1
cd $clone_folder
docker build -f Dockerfile -t $docker_name . >/dev/null 2>&1
docker run -it --rm -d --name=$docker_name $docker_name >/dev/null 2>&1

docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $docker_name