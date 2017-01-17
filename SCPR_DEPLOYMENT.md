SCPR DEPLOYMENT
===============

Here, at SCPR/KPCC, I have decided to go with a Docker-based deployment through Amazon Elastic Container Service(aka ECS).  While the initial setup was a challenge, the goal was to provide an easy way to deploy new versions of Grand Central, upgrade the database software painlessly(CouchDB, in this case), and roll back to previous images.  Hopefully, this should require only limited ops work and, ideally, little to no command line.

# What is Docker?

I'd suggest you read up on [Docker](https://www.docker.com/) before going deeper, but here's a quick explanation of terminologies: 

Docker is a way of building application **images** that are run in a "containerized" environment, similar to a sandbox.  This is achieved using a **Dockerfile** which is a set of instructions Docker uses to build an image using your application code and a *nix base image(typically Debian or Ubuntu).  A compiled Docker image is then mounted to a container on the host operating system where it can run its application code.  This not only reduces the burden of server configuration, but it makes the environment of an application versionable and simple to mount and execute.  Theoretically, a successfully-built Docker image should always run the same on any machine that can run the Linux kernel.  On a Linux distro like Debian, a Docker image can be run natively.  MacOS & Windows need [Docker Machine](https://docs.docker.com/machine/) and virtual machine software like [VirtualBox](https://www.virtualbox.org/wiki/VirtualBox) to run a "host" Linux OS for Docker.

# Amazon ECS

[Elastic Container Service](https://aws.amazon.com/ecs/) is a way of managing a cluster of Docker containers in the Amazon cloud.  ECS implements Docker inside EC2 instances and uses **tasks** to mount your Docker images with a given configuration.  I will talk about how to use tasks later.  When you scale up and down a cluster, the number of EC2 instances with your image is automatically increased and decreased.  ECS is a great way to manage a cluster of Docker images while having other AWS features available such as Elastic Load Balancing, S3 storage, and IAM roles.

Because Grand Central, at this point, doesn't need to be run at a large scale, and because a non-cluster configuration is a bit easier to reason about, I won't be talking about implementing things like load balancing.

## The Database

In production, Grand Central stores documents in an instance of CouchDB.  The brilliance of Docker & ECS is that, with the right configuration, we can simply pull an image from the [CouchDB Docker Hub repo](https://hub.docker.com/r/klaemo/couchdb/) and we're done.

Well, almost.  The problem with ECS is that instances are always treated as short-lived, which means if an instance is terminated one way or another, the storage for that instance immediately goes away.  The challenge here is **persistent storage**.  For the database.  There is no way to prevent an ECS volume from being automatically destroyed by the cluster manager, even if you set an instance to have termination protection.

Here's how I worked around this:

1. I created a new Elastic Block Store volume, which I named "grand-central-persistence".  Just 16 GiB at the time of writing this.
2. Then I attached the volume to my single Grand Central EC2 instance that I have running.  Basically, in the AWS interface, you right-click on the volume and select "Attach Volume", and then choose the name of the EC2 instance you want it to be attached to.
3. Because the volume is unformatted, I went SSH'd into the instance and used `mkfs` to format the volume as an ext4 file system.
4. Added this line to **/etc/fstab**: `/dev/xvdf  /opt/couchdb ext4    defaults        0   1`
5. After rebooting the instance, the volume is now mounted as an emptry drive under `/opt/couchdb` on the host file system.
6. For CouchDB to actually persist its data outside its container, the ECS task has to be configured as such for it to write to `/opt/couchdb`:
   ```json
      "mountPoints": [
        {
          "containerPath": "/opt/couchdb/data",
          "sourceVolume": "couch-data",
          "readOnly": null
        },
        {
          "containerPath": "/opt/couchdb/etc",
          "sourceVolume": "couch-etc",
          "readOnly": null
        }
      ],
   ```
   ```json
    "volumes": [
      {
        "host": {
          "sourcePath": "/opt/couchdb/data"
        },
        "name": "couch-data"
      },
      {
        "host": {
          "sourcePath": "/opt/couchdb/etc"
        },
        "name": "couch-etc"
      }
    ],
   ```
   Essentially, latter creates some named "volumes" linked to paths in the host OS filesystem(in this case, our **grand-central-persistence**) and the former specifies what directories in the Docker container should be stored in what volume name.

The way that I have implemented storage is limiting because new ECS instances, if we ever need them, will not be configured to mount the volume by default.  Even then, there might be an issue running multiple instances of CouchDB on the same database files.(???)  I will be looking into taking a snapshot of the current configuration so that a new instance can at least have the correct fstab file without having to SSH.

So, it's not the best thing in the world, but what I was looking for in ECS in this case was not the ability to build a scalable cluster but to take advantage of the ease of deployment for both the Grand Central application and CouchDB.  A similar setup could be achieved with straight EC2, but that would be more of a PITA and would not come with a deployment management interface and private Docker repo built in.

## How to deploy Grand Central

These instructions only apply to the setup at SCPR.

1. Make sure you have Docker and the AWS CLI configured/running correctly on your local machine.  You may need to run something like `eval $(aws ecr get-login --region us-west-1)`, depending on your region, to authenticate with AWS.
2. Build an image of Grand Central based on your local copy of the code: `docker build -t grand-central .`
3. If the build process returned no errors, you can optionally test the image by running `docker run -i -t grand-central:latest`.
4. Tag the image with the URI of the remote repo, like this: `docker tag grand-central:latest <repo url>/grand-central:latest`.
5. Push the image to the repo: `docker push <repo url>/grand-central:latest`
6. In the Amazon ECS interface in the AWS console, select **grand-central** under Clusters.
7. Under the **tasks** tab, select the task with the `grand-central:**` task definition and click the button that says **Stop**.  Do not stop any other tasks.
8. Click the blue button that says **Run new Task**.  This will bring you to a new page.
9. In the task definition dropdown, select the one called "grand-central" with the highest revision number.  Then choose "grand-central" as the cluster.  Make sure the number of tasks stays at **1**.  Then click the blue button that says **Run task**.

In the future, builds can be automated.  In fact, it may even be possible to extend Deploybot with the AWS SDK to run the deployment from Slack.

### NOTES

The Grand Central and CouchDB images both run on the same instance.  ECS instances automatically assign `localhost.localdomain` as the hostname of the virtual gateway, which Grand Central uses to communicate with CouchDB on `http://localhost.localdomain:5984/`.

Production secrets get downloaded from S3.  For Grand Central to do this, it takes an access key and ID from environment variables set in the task definition.  I really don't like this, but for some reason I can't seem to get an IAM policy to work with the instance so that it is authorized to download the secrets file.  As soon as I find a way to do this, environment variables won't have to be stored anymore.

No security has currently been implemented with CouchDB, which is fine because Grand Central can just perform its duties without being exposed 99% of the time.  However, CouchDB's Fauxton interface provides nice viewability for the database, so sometimes I plan on opening up the ports when we need to use Fauxton but keep them closed the rest of the time.  There is an admin user and password for Fauxton stored in Meldium.