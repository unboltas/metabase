git reset HEAD~1
rm ./backport.sh
git cherry-pick a536c2d7bf24d111cace04abeedff5f33ac751d5
echo 'Resolve conflicts and force push this branch'
