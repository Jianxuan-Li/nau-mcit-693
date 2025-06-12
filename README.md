# gpxbase.com

## Deployment

### Minimalized K3s installation

```shell
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server --disable=traefik --disable=servicelb --disable=local-storage --disable=metrics-server --flannel-backend=vxlan" sh -
```

* `--disable=traefik` reduce memory usage, so the network traffic directly goes to pod
* `--disable=servicelb` disable load balancer to reduce memory usage, use node port instead
* `--disable=local-storage` disable k3s local storage layer, use manually created PV and PVC instead
* `--disable=metrics-server` disable metrics server to reduce resource usage
* `--flannel-backend=vxlan` use VXLAN backend for less memory use

### Server resource

* 1 vCPU
* 2GB memory

### Steps

1. create secret for Github container registry

```shell
kubectl create secret docker-registry azure-host-ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=GH_USER_NAME_HERE \
  --docker-password=TOKEN_HERE
```

2. Create secret for tls pem and private key

```shell
kubectl create secret tls gpxbase-tls   --cert=/etc/ssl/cloudflare/gpxbase.com.pem   --key=/etc/ssl/cloudflare/gpxbase.com.key
```