"""Full SHACL engine check, independent from the JavaScript evaluator."""
from pathlib import Path
from pyshacl import validate
import json
results=[]
for name,expected in [('valid',True),('invalid',False)]:
 conforms,_,report=validate(data_graph=f'examples/tri-graph/records.{name}.ttl',shacl_graph='formal/palo-tri-graph.shacl.ttl',ont_graph='formal/palo-tri-graph.ttl',data_graph_format='turtle',shacl_graph_format='turtle',ont_graph_format='turtle',inference='rdfs',do_owl_imports=False)
 assert conforms is expected,report
 results.append({'fixture':name,'conforms':bool(conforms),'expected':expected,'report':report})
print(json.dumps({'engine':'pyshacl','scope':'Structural exported RDF profile only; not authorization, full runtime semantics or storage immutability','results':results},indent=2))
