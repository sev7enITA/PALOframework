"""Generate the manuscript's PGFPlots figure from executed synthetic results."""
import json
from pathlib import Path

paper = Path(__file__).resolve().parents[1]
results = json.loads((paper / "reproducibility/results.json").read_text())
coordinates = " ".join(
    f"({row['switchOtherMicros']/1e6:.4f},{row['switchPerAcceptedMicros']/1e6:.8f})"
    for row in results["illustrativeRouting"]["sensitivity"]
)
template = r"""\begin{tikzpicture}
\begin{axis}[width=\columnwidth,height=52mm,xmin=0,xmax=1,ymin=0.0075,ymax=0.0225,xlabel={Other switch costs (USD)},ylabel={USD per accepted task},tick label style={font=\scriptsize},label style={font=\small},legend style={font=\scriptsize,at={(0.03,0.97)},anchor=north west,draw=none,fill=white},scaled y ticks=false,ytick={0.01,0.015,0.02},yticklabel style={/pgf/number format/fixed,/pgf/number format/precision=3},grid=major,grid style={gray!20}]
\addplot[black,thick,dashed] coordinates {(0,0.015) (1,0.015)};
\addlegendentry{Stay, all costs}
\addplot[blue!60!black,thick] coordinates {COORDS};
\addlegendentry{Switch, all costs}
\addplot[only marks,mark=*,black] coordinates {(0.5,0.015)};
\end{axis}
\end{tikzpicture}
"""
(paper / "generated").mkdir(exist_ok=True)
(paper / "generated/sensitivity.tex").write_text(template.replace("COORDS", coordinates))
