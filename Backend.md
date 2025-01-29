# Docker Swarm Traefik Setup

## Core Infrastructure
- Manager Node: hostname:
- Worker Node: hostname:

## Directory Structure
/home/reverse/Dockers/
├── docker-compose.yaml      # Core Traefik configuration
├── traefik_dynamic.yaml     # Dynamic Traefik configuration
├── service-template.yaml    # Template for new services
├── letsencrypt/            # SSL certificates
│   └── acme.json           # (600 permissions required)
└── README.md

## Deployment Steps
1. Create required networks:
   $ docker network create -d overlay traefik-public
   $ docker network create -d overlay tailscale

2. Set correct permissions:
   $ chmod 600 letsencrypt/acme.json

3. Deploy Traefik:
   $ docker stack deploy -c docker-compose.yaml traefik

## Adding New Services
1. Copy service-template.yaml to a new file
2. Modify the configuration for your service
3. Deploy with:
   $ docker stack deploy -c your-service.yaml your-stack-name

## Security Notes
- Dashboard is only accessible via Tailscale network (100.110.252.65:9000)
- All services use HTTPS by default
- HTTP automatically redirects to HTTPS
- Core configuration is separate from service configurations
- Dynamic configuration handles dashboard security

## Ports
- 80: HTTP (redirects to HTTPS)
- 443: HTTPS
- 9000: Dashboard (Tailscale only)

## Troubleshooting
1. Check Traefik logs:
   $ docker service logs traefik_traefik

2. Verify service is running:
   $ docker stack ps traefik



4. Verify networks:
   $ docker network ls | grep traefik

## Maintenance
- Monitor certificate renewals in letsencrypt/acme.json
- Check logs periodically for any issues
- Keep Traefik version updated for security patches
- Backup acme.json file before major changes

## Common Issues
1. Dashboard 403 Forbidden
   - Verify accessing from Tailscale network
   - Check IP whitelist configuration in traefik_dynamic.yaml
   - Ensure you're using the correct Tailscale IP

2. Certificate Issues
   - Verify acme.json permissions (600)
   - Check Let's Encrypt logs
   - Ensure port 80 is accessible for challenges

3. Service Not Accessible
   - Verify service labels
   - Check service is in traefik-public network
   - Review Traefik logs for routing issues

## Network Architecture
- traefik-public: For external service access
- tailscale: For internal/admin access
- All admin interfaces restricted to Tailscale network
- Public services must specify traefik-public network

## Service Template Usage
1. Copy service-template.yaml to new file:
   $ cp service-template.yaml my-service.yaml

2. Required modifications:
   - Change service name
   - Update image
   - Set domain name
   - Adjust port if needed

3. Optional configurations:
   - Add environment variables
   - Configure volumes
   - Set deployment constraints

## Backup and Recovery
1. Critical files to backup:
   - letsencrypt/acme.json
   - traefik_dynamic.yaml
   - All service configurations

2. Recovery steps:
   - Restore backed up files
   - Verify permissions
   - Redeploy stack

## Version Information
- Traefik Version: v3.0
- Docker Swarm Mode: Required
- Minimum Docker version: 20.10.0 