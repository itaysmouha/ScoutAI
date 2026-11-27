VENV := .venv

.PHONY: install api worker web

install:
	python3 -m venv $(VENV)
	$(VENV)/bin/pip install -q -r services/api/requirements.txt
	$(VENV)/bin/pip install -q -r services/worker/requirements.txt
	cd frontend && npm install

api:
	set -a && . services/api/.env && set +a && $(VENV)/bin/uvicorn services.api.main:app --reload --port 8000

worker:
	set -a && . services/worker/.env && set +a && $(VENV)/bin/python services/worker/worker.py

web:
	cd frontend && npm run dev
