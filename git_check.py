import subprocess

def run(cmd):
    return subprocess.check_output(cmd, shell=True).decode().strip()

print("Remotes:")
print(run("git remote -v"))
print("\nBranches:")
print(run("git branch -a"))
print("\nLog:")
print(run("git log -1"))
