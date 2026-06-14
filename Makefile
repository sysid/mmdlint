.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

SHELL = bash
.ONESHELL:

################################################################################
# Testing \
TESTING:  ## ############################################################

.PHONY: test
test:  ## run all tests
	npx vitest run

.PHONY: test-watch
test-watch:  ## run tests in watch mode
	npx vitest watch

################################################################################
# Code Quality \
QUALITY:  ## ############################################################

.PHONY: lint
lint:  ## lint + format check with biome
	npx biome check .

.PHONY: lint-fix
lint-fix:  ## autofix linter/formatter findings
	npx biome check --write .

.PHONY: typecheck
typecheck:  ## type-check without emitting
	npx tsc --noEmit

.PHONY: check
check: lint typecheck test  ## run all checks (lint + typecheck + test)

################################################################################
# Build \
BUILD:  ## ############################################################

.PHONY: build
build:  ## compile TypeScript to dist/
	npx tsc

.PHONY: clean
clean:  ## remove build output
	rm -rf dist

################################################################################
# Setup \
SETUP:  ## ############################################################

.PHONY: install
install:  ## install dependencies
	npm install

.PHONY: link
link: build  ## install mmdlint globally as a symlink to this build (dev)
	npm link
	@echo "Linked. Run 'mmdlint --help' from anywhere."

.PHONY: unlink
unlink:  ## remove the global symlink
	npm unlink -g @sysid/mmdlint

################################################################################
# Versioning \
VERSIONING:  ## ############################################################

.PHONY: bump-patch
bump-patch: check-github-token  ## bump patch version, tag, release
	bump-my-version bump --commit --tag patch
	git push && git push --tags
	@$(MAKE) create-release

.PHONY: bump-minor
bump-minor: check-github-token  ## bump minor version, tag, release
	bump-my-version bump --commit --tag minor
	git push && git push --tags
	@$(MAKE) create-release

.PHONY: bump-major
bump-major: check-github-token  ## bump major version, tag, release
	bump-my-version bump --commit --tag major
	git push && git push --tags
	@$(MAKE) create-release

.PHONY: create-release
create-release: check-github-token
	@VERSION=$$(cat VERSION); \
	if ! command -v gh &>/dev/null; then \
		echo "gh CLI not installed. Please create the release manually."; exit 1; \
	else \
		echo "Creating GitHub release for v$$VERSION"; \
		gh release create "v$$VERSION" --generate-notes; \
	fi

.PHONY: publish
publish: check check-npm-login  ## build + publish to npm (public)
	npm publish --access public

.PHONY: check-npm-login
check-npm-login:  ## check if logged into npm
	@if ! npm whoami &>/dev/null; then \
		echo "Not logged into npm. Run 'npm login' first."; exit 1; \
	fi
	@echo "npm: logged in as $$(npm whoami)"

.PHONY: check-github-token
check-github-token:  ## check if GITHUB_TOKEN is set
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "GITHUB_TOKEN is not set. Please export your GitHub token before running this command."; exit 1; \
	fi
	@echo "GITHUB_TOKEN is set"

################################################################################
# Misc \
MISC:  ## ############################################################

define PRINT_HELP_PYSCRIPT
import re, sys

for line in sys.stdin:
	match = re.match(r'^([a-zA-Z0-9_-]+):.*?## (.*)$$', line)
	if match:
		target, help = match.groups()
		print("\033[36m%-20s\033[0m %s" % (target, help))
endef
export PRINT_HELP_PYSCRIPT

.PHONY: help
help:
	@python3 -c "$$PRINT_HELP_PYSCRIPT" < $(MAKEFILE_LIST)
