git reset HEAD~1
rm ./backport.sh
git cherry-pick 6ead51550d5bb356369f8e223758bef761547380
echo 'Resolve conflicts and force push this branch'
