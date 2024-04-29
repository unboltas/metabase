git reset HEAD~1
rm ./backport.sh
git cherry-pick 9a8ddfef39526fab1d771b3f8169f518440fb16b
echo 'Resolve conflicts and force push this branch'
