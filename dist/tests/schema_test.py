#!/usr/bin/env python3
"""Optional Draft 2020-12 validation. Dependency: jsonschema (development only)."""
import json
from pathlib import Path
import jsonschema
ROOT=Path(__file__).resolve().parents[1]
count=0
for family,name in [('learning/concepts','learning-concept'),('learning/activities','activity'),('learning/routes','learning-route'),('sandbox/examples','sandbox')]:
    schema=json.loads((ROOT/'protocol'/f'{name}.schema.json').read_text(encoding='utf-8'))
    jsonschema.Draft202012Validator.check_schema(schema)
    validator=jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker())
    for source in sorted((ROOT/family).glob('*.json')):
        validator.validate(json.loads(source.read_text(encoding='utf-8')));count+=1
schema=json.loads((ROOT/'protocol/learner-state.schema.json').read_text(encoding='utf-8'));jsonschema.Draft202012Validator.check_schema(schema)
validator=jsonschema.Draft202012Validator(schema,format_checker=jsonschema.FormatChecker())
validator.validate({'schema_version':'qeva-learner/1','discoveries':[],'attempts':[],'preferences':{'mode':'guided','goal':'chaos'}});count+=1
validator.validate({'schema_version':'qeva-learner/1','discoveries':['qeva:learning:sequence@1'],'attempts':[{'id':'schema-specimen-1','activity_ref':'qeva:activity:sequence-next@1','at':'2026-09-09T00:00:00.000Z','response':{'value':'17'}}],'preferences':{'mode':'guided','goal':'chaos'}});count+=1
print(f'schema: OK: all 5 new schemas valid; {count} documents/specimens valid with date-time checks; semantic graph/arithmetic checks are additional')
