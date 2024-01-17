# actions-docker

[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

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
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
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
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
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
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
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
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          tags: |
            eu.gcr.io/tradeshift-base/my-repo:master
            eu.gcr.io/tradeshift-base/my-repo:latest
```

### Image traceability with labels

If you want to be able to lookup the repository for your image, or add more metadata
you can add labels.

```yaml
jobs:
  docker:
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          labels: |
            git-repo:${{ github.event.repository.name }}
            owner:my-team
```

### Caching

Github repo cache can be enabled for caching docker layers.

```yaml
jobs:
  docker:
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          repo-cache: true
```

We currently don't support docker registry caching but that should be
implemented in the future.

### Platform

Build docker images against a specific list of platforms (processor architecures)

```yaml
jobs:
  docker:
    runs-on: [self-hosted,ts-large-x64-docker-large]
    steps:
      - uses: actions/checkout@v4
      - uses: tradeshift/actions-docker@v1
        with:
          password: ${{ secrets.GCLOUD_SERVICE_ACCOUNT_KEY_NOBASE64 }}
          platform: linux/amd64,linux/arm6
```

This uses the docker buildx virtualization support to build multi arch docker images

#### Invalidating cache

If we need to invalidate the cache for some reason, we can set the
`repo-cache-key` input to something else than `buildx`. This will restore and
save cache under a new key in the github repo cache, thereby invalidating the
cache.
