# actions-docker

This is an action for building and pushing docker images. A rough overview of
the process:

- Login to registry
- Setup buildx builder
- Build and push image

## Usage `tradeshift/actions-docker@v1`

The following are a few different usage examples

### A dockerfile in the root of the repo

The most common usecase is to build a single dockerfile in the root of the
repo. All that you need to do in that case is this.

```yaml
jobs: 
  docker:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
```

### Multiple images in one repo

If you are only building one image usually that would be named the same as the
repo. In the event that you need to build multiple images, you would need to
specify what the repository for each of them should be as well as the context
and optionally the path to the dockerfiles.

In the following example we are building two images from `Dockerfile.a` and
`Dockerfile.b` both of which are residing in the root of the repo.

```yaml
jobs: 
  docker:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          file: Dockerfile.a
          repository: eu.gcr.io/tradeshift-base/my-repo-image-a
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          file: Dockerfile.b
          repository: eu.gcr.io/tradeshift-base/my-repo-image-b
```

Another example where we have a dedicated folder for each of the images. The
image dockerfiles are in the root of their respective folders. In the following
example the folders are called `image-a` and `image-b`

```yaml
jobs: 
  docker:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          context: image-a
          repository: eu.gcr.io/tradeshift-base/my-repo-image-a
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          context: image-b
          repository: eu.gcr.io/tradeshift-base/my-repo-image-b
```

### Setting additional tags

By default we only push a tag of the git SHA. In some cases you might want
additional tags. Maybe you want a tag `master` for the most recent build of the
master branch. In the following example we add the master and latests tags.

```yaml
jobs: 
  docker:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v2
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          tags: |
            eu.gcr.io/tradeshift-base/my-repo:master
            eu.gcr.io/tradeshift-base/my-repo:latest
```
