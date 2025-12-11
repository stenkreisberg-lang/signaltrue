#!/bin/bash

# Exit on error
set -o errexit

# Clean npm cache
npm cache clean --force

# Install dependencies
npm ci
