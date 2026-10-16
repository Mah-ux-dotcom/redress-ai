.PHONY: run build stop test benchmark

IMAGE ?= redress-apertus
PORT ?= 8080
# apertus (default) | mock (no model needed) | off (rules only)
MODE ?= apertus
# Optional: LLM_NAME, LLM_BASE_URL and LLM_API_KEY from your shell, or from a .env file here.
ENV_FILE := $(wildcard .env)

# Build the image (runs the test suite) and start REDRESS on http://localhost:$(PORT)
run: build
	docker run --rm --init --name $(IMAGE) -p $(PORT):8080 -e PUBLIC_PORT=$(PORT) \
		$(if $(ENV_FILE),--env-file $(ENV_FILE)) \
		-e LLM_NAME -e LLM_BASE_URL -e LLM_API_KEY \
		$(IMAGE)

build:
	docker build --build-arg APERTUS_MODE=$(MODE) -t $(IMAGE) .

stop:
	-docker stop $(IMAGE)

# Unit tests and the Apertus benchmark, in a throwaway Node container
test:
	docker run --rm -v "$(CURDIR)":/work -w /work/src node:22-alpine sh -c "npm ci --no-audit --no-fund && npm test"

benchmark:
	docker run --rm -v "$(CURDIR)":/work -w /work/src -e LLM_NAME -e LLM_BASE_URL -e LLM_API_KEY \
		$(if $(ENV_FILE),--env-file $(ENV_FILE)) node:22-alpine sh -c "npm ci --no-audit --no-fund && npm run benchmark:apertus"
