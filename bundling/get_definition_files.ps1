Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'



###################################################################################
function CopyDefiniotnFiles($srcDistFilesRoot, $definitionFilesDirTarget)
{
	Write-Host "Clear and recreate target '$definitionFilesDirTarget' directory..."
	if ([System.IO.Directory]::Exists($definitionFilesDirTarget))
	{
		Write-Host "Delete '$definitionFilesDirTarget' content"
		[System.IO.Directory]::Delete($definitionFilesDirTarget, $true)
	}
	$currentPath = (Resolve-Path .\).Path
	$definitionFilesTargetDirInfo = [System.IO.Directory]::CreateDirectory($currentPath + '\' + $definitionFilesDirTarget)
	Write-Host "Done."
	
	Write-Host "Get dist directories..."
	#liste des rep de distribution
	$directories = Get-ChildItem -Path $srcDistFilesRoot -Filter 'amd' -Directory -Recurse
	
	Write-Host "$($directories.Count) directories found."
	
	Write-Host "Copy definition files..."
	foreach($directory in $directories)
	{
		Write-Host "Get definition files in $($directory.FullName) ..."
		[System.IO.FileInfo[]] $definitionFiles = Get-ChildItem -Path $directory.FullName -Filter '*.d.ts' -File
		if ($definitionFiles -ne $null)
		{
			Write-Host "$($definitionFiles.Count) definition files found."
			if ($definitionFiles.Count -gt 0)
			{
				[System.IO.FileInfo]$definitionFile = $definitionFiles[0]
				$src = $definitionFile.FullName
				$dest = $($definitionFilesTargetDirInfo.FullName + '\' +  $definitionFile.Name)
				Write-Host "src=$src, dest=$dest"
				Copy-Item -Path $src -Destination $dest
			}
		}
		else
		{
			Write-Host "No definition files found."
		}
	}
	Write-Host 'Done.'
}

######################################################################################

Write-Host 'Copy Typescript aurelia definition files...'

CopyDefiniotnFiles 'dwn\unzip-master' 'out\aurelia-definition-latest\aurelia'
CopyDefiniotnFiles 'dwn\unzip' 'out\aurelia-definition\aurelia'


Write-Host 'Script completed.'