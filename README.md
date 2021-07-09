# Promote a staging Nexus repository to MavenCentral
[![build](https://github.com/ViliusSutkus89/promote-Nexus-repository-to-MavenCentral/actions/workflows/build.yml/badge.svg)](https://github.com/ViliusSutkus89/promote-Nexus-repository-to-MavenCentral/actions/workflows/build.yml)

## The why
I had a need to promote a staging repository in Sonatype Nexus to MavenCentral.  

## The how
Based on [promoteStagingRepository](https://github.com/ViliusSutkus89/Sample_Android_Library-MavenCentral-Instrumented_Tests/blob/75c32f434c9cf8befb4da727ae744c2aed1377e2/ci-scripts/promoteStagingRepository) perl script, packaged as GitHub action.

Method of operation:
1) Extract Sonatype URI (`https://oss.sonatype.org/service/local/`) and repository ID (`comviliussutkus89-1199`) from supplied repository URI (`https://oss.sonatype.org/service/local/repositories/comviliussutkus89-1199/content/`)
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

## Inputs
#### Required inputs
Name | Description
--- | ---
repositoryURI | Example URI - https://oss.sonatype.org/service/local/repositories/comviliussutkus89-1208/content/ 
sonatypeUsername | Username part of the access token generated in oss.sonatype.org
sonatypePassword | Password part of the access token generated in oss.sonatype.org

### Optional inputs
Name | Default value | Description
--- | --- | ---
mavenCentralURL | https://repo1.maven.org/maven2/ | Final resting place of published artifacts.
censorProfileId  | true | ProfileID may be sensitive data. Should it be censored in the logs?
printResponseBodyInErrors | false | Responses from Sonatype may contain sensitive data, should it be printed when printing errors? This may leak ProfileId.

## Outputs
Name | Description | Example value
--- | --- | ---
artifacts | JSON array of published artifact URLs |  ["https://repo1.maven.org/maven2/com/","https://repo1.maven.org/maven2/com/viliussutkus89/","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.asc","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.asc.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.asc.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.asc.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.asc.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-javadoc.jar.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.asc","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.asc.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.asc.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.asc.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.asc.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5-sources.jar.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.asc","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.asc.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.asc.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.asc.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.asc.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.aar.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.asc","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.asc.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.asc.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.asc.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.asc.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.module.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.asc","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.asc.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.asc.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.asc.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.asc.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/0.0.5/samplelib-promote-test-0.0.5.pom.sha512","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/maven-metadata.xml","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/maven-metadata.xml.md5","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/maven-metadata.xml.sha1","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/maven-metadata.xml.sha256","https://repo1.maven.org/maven2/com/viliussutkus89/samplelib-promote-test/maven-metadata.xml.sha512","https://repo1.maven.org/maven2/archetype-catalog.xml"]
