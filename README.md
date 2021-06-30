# Promote a staging Nexus repository to MavenCentral
[![build](https://github.com/ViliusSutkus89/promote-Nexus-repository-to-MavenCentral/actions/workflows/build.yml/badge.svg)](https://github.com/ViliusSutkus89/promote-Nexus-repository-to-MavenCentral/actions/workflows/build.yml)

## The why
I had a need to promote a staging repository in Sonatype Nexus to MavenCentral.  

## The how
Based on [promoteStagingRepository](https://github.com/ViliusSutkus89/Sample_Android_Library-MavenCentral-Instrumented_Tests/blob/75c32f434c9cf8befb4da727ae744c2aed1377e2/ci-scripts/promoteStagingRepository) perl script, packaged as GitHub action.

Method of operation:
1) Extract Sonatype URI (`https://oss.sonatype.org/service/local/`) and repositoryID (`comviliussutkus89-1199`) from supplied repository URI (`https://oss.sonatype.org/service/local/repositories/comviliussutkus89-1199/content/`)
2) Query `https://oss.sonatype.org/service/local/staging/repository/comviliussutkus89-1199` to obtain profileID
3) Send promote request to `https://oss.sonatype.org/service/local/staging/profiles/${profileId}/promote`

## Example workflow

```yaml
name: buildMyLibrary
on: push

jobs:
  build:
    environment: BuildWithDeployToSonatype
    outputs:
      STAGING_REPO_URI: ${{ steps.sonatype.outputs.stagingRepoUri }}
    runs-on: ubuntu-20.04
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          distribution: zulu
          java-version: 8
      - uses: android-actions/setup-android@v2

      - run: ./gradlew assembleRelease

      - name: 'Publish to Sonatype'
        run: ./gradlew publishToSonatype closeSonatypeStagingRepository | tee publishToSonatype.log
        # bash has pipefail on by default, which is needed for tee to fail, if gradle fails
        shell: bash
        env:
          ORG_GRADLE_PROJECT_sonatypeUsername: ${{ secrets.SONATYPE_USERNAME }}
          ORG_GRADLE_PROJECT_sonatypePassword: ${{ secrets.SONATYPE_PASSWORD }}
          SIGNING_KEY: ${{ secrets.SIGNING_KEY }}
          SIGNING_PASS: ${{ secrets.SIGNING_PASS }}

      - name: 'Parse Sonatype repository'
        id: sonatype
        # publishToSonatype.log contains a line looking like this:
        # Created staging repository 'comviliussutkus89-1055' at https://oss.sonatype.org/service/local/repositories/comviliussutkus89-1055/content/
        run: perl -ne 'print "::set-output name=stagingRepoUri::$1\n" if /^Created staging repository .+ at (.+)$/' < publishToSonatype.log

  releaseSonatype:
    # Different environment, for manual approval gate
    environment: ReleaseSonatype
    needs: build
    runs-on: ubuntu-20.04
    steps:
      - uses: ViliusSutkus89/promote-Nexus-repository-to-MavenCentral@v1
        with:
          repositoryURI: ${{ needs.build.outputs.STAGING_REPO_URI }}
          sonatypeUsername: ${{ secrets.SONATYPE_USERNAME }}
          sonatypePassword: ${{ secrets.SONATYPE_PASSWORD }}  
```
