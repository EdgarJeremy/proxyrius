#/bin/bash

# Command : ./removeContainer.sh $repo_name $branch_name
# Output : Untagged: container:tag
#          Deleted: container sha256

# $1 = Repository Name
# $2 = Branch Name

rep_name=$1
branch_name=$2

clone_folder=$rep_name.$branch_name
docker_name=$clone_folder

cd ./pr
docker container stop $docker_name >/dev/null 2>&1
docker container rm $docker_name >/dev/null 2>&1
docker rmi $docker_name

rm -rf $clone_folder