import type { PaperQuestions } from "../types";
import type { RichNode } from "../rich";
import apparatusA from "@/assets/mcq/chem-2019-feb-V2/apparatus-a.svg";
import apparatusB from "@/assets/mcq/chem-2019-feb-V2/apparatus-b.svg";
import apparatusC from "@/assets/mcq/chem-2019-feb-V2/apparatus-c.svg";
import apparatusD from "@/assets/mcq/chem-2019-feb-V2/apparatus-d.svg";
import atomDiagram from "@/assets/mcq/chem-2019-feb-V2/atom-diagram.svg";
import molecule from "@/assets/mcq/chem-2019-feb-V2/molecule.svg";

const b = (text: string): RichNode => ({ text, bold: true });
const i = (text: string): RichNode => ({ text, italic: true });
const hi = (text: string): RichNode => ({
  text,
  highlight: "bg-yellow-300/40 dark:bg-yellow-500/25",
});
const u = (text: string): RichNode => ({ text, underline: true });
const primary = (text: string): RichNode => ({ text, color: "text-primary", bold: true });
const danger = (text: string): RichNode => ({ text, color: "text-red-500", bold: true });
const sub = (text: string): RichNode => ({ text, sub: true });
const sup = (text: string): RichNode => ({ text, sup: true });
const br: RichNode = { br: true };
const tick: RichNode = { symbol: "tick" };
const cross: RichNode = { symbol: "cross" };
const arrow: RichNode = { symbol: "arrow" };
const eq: RichNode = { symbol: "revHalfArrow" };

export const CHEM_2019_FEB_V2: PaperQuestions = [
  // Q1 — text vertical
  {
    n: 1,
    order: ["intro", "question"],
    intro: [
      "This question is about ",
      b("atomic structure"),
      ". Atoms contain three subatomic particles: protons, neutrons and electrons.",
    ],
    question: [
      "Which particle has ",
      hi("no overall electrical charge"),
      " and a relative mass of approximately 1?",
    ],
    layout: {
      type: "text-vertical",
      options: {
        A: ["Electron"],
        B: ["Neutron"],
        C: ["Proton"],
        D: ["Nucleus"],
      },
    },
    answer: "B",
  },

  // Q2 — text horizontal
  {
    n: 2,
    order: ["question"],
    question: [
      "What is the ",
      u("chemical symbol"),
      " for the element ",
      { text: "sodium", italic: true, color: "text-primary" },
      "?",
    ],
    layout: {
      type: "text-horizontal",
      options: {
        A: [{ text: "S", font: "mono", size: "lg" }],
        B: [{ text: "So", font: "mono", size: "lg" }],
        C: [{ text: "Na", font: "mono", size: "lg" }],
        D: [{ text: "N", font: "mono", size: "lg" }],
      },
    },
    answer: "C",
  },

  // Q3 — text 2x2, with intro data image
  {
    n: 3,
    order: ["intro", "introData", "question"],
    intro: [
      b("Carboxylic acids"),
      " contain the functional group ",
      { latex: "\\text{-COOH}" },
      ". The molecule below is a common carboxylic acid.",
    ],
    introData: {
      kind: "image",
      image: { src: molecule, alt: "Structure of methanoic acid", invertOnDark: true },
      caption: [i("Structural formula")],
    },
    question: ["Which is the ", b("name"), " of the molecule shown?"],
    layout: {
      type: "text-2x2",
      options: {
        A: ["methanoic acid"],
        B: ["ethanoic acid"],
        C: ["methanol"],
        D: ["ethanol"],
      },
    },
    answer: "A",
  },

  // Q4 — table with header row, options are rows (with intro list)
  {
    n: 4,
    order: ["intro", "introData", "question"],
    intro: [
      "A student tests four unknown gases with different indicators. The observations are shown.",
    ],
    introData: {
      kind: "list",
      ordered: false,
      items: [
        ["damp red litmus paper ", arrow, " turns blue → ", b("alkaline gas")],
        ["damp blue litmus paper ", arrow, " turns red → ", b("acidic gas")],
        ["limewater turns milky → ", b("carbon dioxide")],
      ],
    },
    question: [
      "Which row correctly identifies a gas from its ",
      hi("test result"),
      "?",
    ],
    layout: {
      type: "table-rows",
      header: [[b("Gas")], [b("Test")], [b("Result")]],
      rows: {
        A: [
          ["ammonia"],
          ["damp red litmus"],
          ["turns blue ", tick],
        ],
        B: [
          ["hydrogen"],
          ["limewater"],
          ["turns milky ", cross],
        ],
        C: [
          ["oxygen"],
          ["damp blue litmus"],
          ["turns red ", cross],
        ],
        D: [
          ["chlorine"],
          ["limewater"],
          ["stays colourless ", cross],
        ],
      },
    },
    answer: "A",
  },

  // Q5 — table with 4 header columns being the options
  {
    n: 5,
    order: ["question", "introData"],
    question: [
      "The reaction between hydrogen and iodine is ",
      b("reversible"),
      ": ",
      { latex: "H_2(g) + I_2(g) \\rightleftharpoons 2HI(g)" },
      ". Which set of conditions maximises the yield of ",
      primary("HI"),
      "?",
    ],
    introData: {
      kind: "table",
      header: [
        [b("condition")],
        [b("effect on rate")],
        [b("effect on yield")],
      ],
      rows: [
        [["high pressure"], ["increases"], ["no change (Δn = 0)"]],
        [["catalyst"], ["increases"], ["no change"]],
        [["low temperature"], ["decreases"], ["favours forward (exothermic)"]],
      ],
      caption: [b("Table 5.1"), " — Effect of changing conditions on the H", sub("2"), "/I", sub("2"), " equilibrium."],
    },
    layout: {
      type: "table-cols",
      header: {
        A: ["low ", b("T"), br, "high ", b("p")],
        B: ["high ", b("T"), br, "low ", b("p")],
        C: ["low ", b("T"), br, "low ", b("p")],
        D: ["high ", b("T"), br, "high ", b("p")],
      },
      rows: [
        [["slow, low"], ["fast, low"], ["slow, low"], ["fast, low"]],
        [
          ["✓ good yield"],
          [cross, " poor yield"],
          ["✓ good yield"],
          [cross, " poor yield"],
        ],
      ],
    },
    answer: "A",
  },

  // Q6 — table where 4 specific cells are the options
  {
    n: 6,
    order: ["intro", "question"],
    intro: [
      "The periodic table can be split into blocks. The table below shows some elements.",
    ],
    question: [
      "Which cell contains a ",
      hi("transition metal"),
      " that forms a green compound in aqueous solution?",
    ],
    layout: {
      type: "table-cells",
      // 3x4 grid; option cells at (r,c) below
      grid: [
        [[b("Group 1")], [b("Group 2")], [b("d-block")], [b("Group 7")]],
        [
          ["Li"],
          ["Mg"],
          [{ text: "A. Fe", bold: true }],
          [{ text: "B. Cl", bold: true }],
        ],
        [
          ["Na"],
          ["Ca"],
          [{ text: "C. Cu", bold: true }],
          [{ text: "D. Br", bold: true }],
        ],
      ],
      optionCells: {
        A: { r: 1, c: 2 },
        B: { r: 1, c: 3 },
        C: { r: 2, c: 2 },
        D: { r: 2, c: 3 },
      },
    },
    answer: "C",
  },

  // Q7 — 4 image options
  {
    n: 7,
    order: ["question"],
    question: [
      "Which piece of apparatus would be used to ",
      b("separate sand from salt solution"),
      "?",
    ],
    layout: {
      type: "images",
      options: {
        A: { src: apparatusA, alt: "Filtration apparatus", invertOnDark: true },
        B: { src: apparatusB, alt: "Distillation apparatus", invertOnDark: true },
        C: { src: apparatusC, alt: "Evaporation apparatus", invertOnDark: true },
        D: { src: apparatusD, alt: "Chromatography apparatus", invertOnDark: true },
      },
    },
    answer: "A",
  },

  // Q8 — image hotspots
  {
    n: 8,
    order: ["intro", "question"],
    intro: [
      "The diagram shows a ",
      b("lithium atom"),
      " (",
      { latex: "^{7}_{3}\\text{Li}" },
      "). Click the position that best represents an ",
      hi("outer-shell electron"),
      ".",
    ],
    question: ["Which labelled position is the outer-shell electron?"],
    layout: {
      type: "image-hotspots",
      image: { src: atomDiagram, alt: "Lithium atom diagram", invertOnDark: true },
      hotspots: {
        A: { xPct: 50, yPct: 50 }, // nucleus
        B: { xPct: 61, yPct: 50 }, // inner shell
        C: { xPct: 72.5, yPct: 50 }, // second shell
        D: { xPct: 82, yPct: 50 }, // outer shell
      },
    },
    answer: "D",
  },

  // Q9 — 4 graph options
  {
    n: 9,
    order: ["intro", "question"],
    intro: [
      b("Reaction rate"),
      " of the decomposition ",
      { latex: "2H_2O_2 \\rightarrow 2H_2O + O_2" },
      " is measured by the volume of ",
      primary("O"),
      { text: "2", sub: true, color: "text-primary", bold: true },
      " produced over time. Which graph is ",
      hi("correct"),
      "?",
    ],
    question: ["Choose the graph that matches the description."],
    layout: {
      type: "graphs",
      options: {
        A: {
          xLabel: "time / s",
          yLabel: "V(O₂) / cm³",
          xMin: 0,
          xMax: 60,
          yMin: 0,
          yMax: 50,
          series: [
            {
              kind: "line",
              points: [
                [0, 0],
                [10, 18],
                [20, 30],
                [30, 38],
                [40, 44],
                [50, 47],
                [60, 48],
              ],
              showMarkers: true,
            },
          ],
        },
        B: {
          xLabel: "time / s",
          yLabel: "V(O₂) / cm³",
          xMin: 0,
          xMax: 60,
          yMin: 0,
          yMax: 50,
          series: [
            {
              kind: "line",
              points: [
                [0, 0],
                [10, 8],
                [20, 16],
                [30, 24],
                [40, 32],
                [50, 40],
                [60, 48],
              ],
              color: "stroke-red-500",
            },
          ],
        },
        C: {
          xLabel: "time / s",
          yLabel: "V(O₂) / cm³",
          xMin: 0,
          xMax: 60,
          yMin: 0,
          yMax: 50,
          series: [
            {
              kind: "line",
              points: [
                [0, 48],
                [20, 30],
                [40, 15],
                [60, 0],
              ],
              color: "stroke-emerald-500",
            },
          ],
        },
        D: {
          xLabel: "time / s",
          yLabel: "V(O₂) / cm³",
          xMin: 0,
          xMax: 60,
          yMin: 0,
          yMax: 50,
          series: [
            {
              kind: "line",
              points: [
                [0, 0],
                [10, 5],
                [20, 8],
                [30, 10],
                [40, 11],
                [50, 11.5],
                [60, 12],
              ],
              color: "stroke-amber-500",
            },
          ],
        },
      },
    },
    answer: "A",
  },

  // Q10 — 1 graph with 4 hotspots
  {
    n: 10,
    order: ["introData", "intro", "question"],
    introData: {
      kind: "graph",
      spec: {
        xLabel: "temperature / °C",
        yLabel: "solubility / g per 100 g H₂O",
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100,
        series: [
          {
            kind: "line",
            points: [
              [0, 15],
              [20, 22],
              [40, 35],
              [60, 55],
              [80, 75],
              [100, 95],
            ],
            showMarkers: true,
          },
        ],
      },
      caption: [b("Fig. 10.1"), " — Solubility curve of an unknown salt in water."],
    },
    intro: [
      "The graph shows the ",
      b("solubility"),
      " of a salt in water. Four positions on the curve are marked with option circles.",
    ],
    question: [
      "At which point is the solution ",
      hi("saturated at 60 "),
      { symbol: "deg" },
      hi("C"),
      "?",
    ],
    layout: {
      type: "graph-hotspots",
      spec: {
        xLabel: "temperature / °C",
        yLabel: "solubility / g per 100 g H₂O",
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100,
        series: [
          {
            kind: "line",
            points: [
              [0, 15],
              [20, 22],
              [40, 35],
              [60, 55],
              [80, 75],
              [100, 95],
            ],
          },
        ],
      },
      // These percentages are relative to the outer container; approximate on-curve positions.
      hotspots: {
        A: { xPct: 22, yPct: 78 }, // ~20°C, low
        B: { xPct: 42, yPct: 66 }, // ~40°C
        C: { xPct: 62, yPct: 48 }, // ~60°C on curve — correct
        D: { xPct: 82, yPct: 28 }, // ~80°C
      },
    },
    answer: "C",
  },

  // Q11 — table with subcolumns and a key (ticks/crosses)
  {
    n: 11,
    order: ["intro", "question"],
    intro: [
      "Four unknown white solids ",
      b("W, X, Y, Z"),
      " are tested with dilute hydrochloric acid and with limewater. Bubbles observed and gas turning limewater cloudy is recorded.",
    ],
    question: [
      "Which substance is most likely to be a ",
      hi("carbonate"),
      "?",
    ],
    layout: {
      type: "table-cols-sub",
      header: {
        A: [b("W")],
        B: [b("X")],
        C: [b("Y")],
        D: [b("Z")],
      },
      subHeaders: {
        A: [["dil. HCl"], ["limewater"]],
        B: [["dil. HCl"], ["limewater"]],
        C: [["dil. HCl"], ["limewater"]],
        D: [["dil. HCl"], ["limewater"]],
      },
      rowLabelHeader: [b("observation")],
      rowLabels: [[i("bubbles")], [i("turns cloudy")]],
      rows: [
        // row 1: bubbles?
        [[cross], [cross], [tick], [cross], [tick], [cross], [cross], [cross]],
        // row 2: turns cloudy?
        [[cross], [cross], [tick], [tick], [cross], [cross], [cross], [cross]],
      ],
      keyItems: [
        { symbol: "tick", label: [b("yes")] },
        { symbol: "cross", label: [b("no")] },
      ],
    },
    answer: "B",
  },

  // Q12 — table with subrows
  {
    n: 12,
    order: ["intro", "question"],
    intro: [
      "Four hydrocarbons are burned in a plentiful supply of air. Both the ",
      b("rate of combustion"),
      " and the ",
      b("main product"),
      " are recorded.",
    ],
    question: [
      "Which hydrocarbon is ",
      hi("methane"),
      " (",
      { latex: "CH_4" },
      ")?",
    ],
    layout: {
      type: "table-rows-sub",
      subRowLabelHeader: [b("property")],
      header: [[b("observation")]],
      groups: {
        A: {
          subRowLabels: [["rate"], ["main product"]],
          rows: [
            [["slow, sooty flame"]],
            [["carbon soot + ", { latex: "CO_2" }]],
          ],
        },
        B: {
          subRowLabels: [["rate"], ["main product"]],
          rows: [
            [["fast, clean blue flame"]],
            [[{ latex: "CO_2" }, " + ", { latex: "H_2O" }]],
          ],
        },
        C: {
          subRowLabels: [["rate"], ["main product"]],
          rows: [
            [["moderate, yellow flame"]],
            [[{ latex: "CO" }, " + ", { latex: "H_2O" }]],
          ],
        },
        D: {
          subRowLabels: [["rate"], ["main product"]],
          rows: [
            [["very slow, orange smoky flame"]],
            [["carbon soot only"]],
          ],
        },
      },
      keyItems: [
        { swatch: "hsl(var(--primary-h) var(--primary-s) var(--primary-l))", label: [b("selected row highlights the whole group")] },
      ],
    },
    answer: "B",
  },

  // Q13 — introData graph with curved line-of-best-fit
  {
    n: 13,
    order: ["intro", "introData", "question"],
    intro: [
      "The graph shows how the ",
      b("solubility"),
      " of a salt in water changes with temperature. A ",
      hi("curved line of best fit"),
      " has been drawn through the measured points.",
    ],
    introData: {
      kind: "graph",
      spec: {
        xLabel: "temperature / °C",
        yLabel: "solubility / g per 100 g water",
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 120,
        series: [
          {
            kind: "line",
            points: [
              [10, 20],
              [20, 26],
              [30, 36],
              [40, 52],
              [50, 70],
              [60, 88],
              [70, 105],
              [80, 115],
            ],
            lobf: "curve",
            marker: "circle",
            color: "#3b82f6",
            name: "measured data",
          },
        ],
      },
      caption: [b("Fig. 13.1"), " — Solubility of the salt against temperature (curve of best fit)."],
    },
    question: [
      "What does the ",
      b("shape"),
      " of the best-fit curve suggest about solubility with temperature?",
    ],
    layout: {
      type: "text-vertical",
      options: {
        A: ["Decreases linearly."],
        B: ["Stays constant."],
        C: ["Increases, and the rate of increase grows with temperature."],
        D: ["Increases, but the rate of increase falls with temperature."],
      },
    },
    answer: "C",
  },

  // Q14 — introData graph with straight LOBF, multiple lines w/ legend + triangles
  {
    n: 14,
    order: ["intro", "introData", "question"],
    intro: [
      "Three catalysts (",
      b("A"),
      ", ",
      b("B"),
      ", ",
      b("C"),
      ") were tested for the same reaction. The volume of ",
      primary("O"),
      sub("2"),
      " produced was recorded and a ",
      hi("straight line of best fit"),
      " drawn for each.",
    ],
    introData: {
      kind: "graph",
      spec: {
        xLabel: "time / s",
        yLabel: "V(O₂) / cm³",
        xMin: 0,
        xMax: 60,
        yMin: 0,
        yMax: 60,
        showLegend: true,
        series: [
          {
            kind: "line",
            name: "catalyst A",
            points: [
              [0, 0],
              [10, 9],
              [20, 19],
              [30, 30],
              [40, 40],
              [50, 49],
            ],
            lobf: "linear",
            marker: "circle",
            color: "#3b82f6",
          },
          {
            kind: "line",
            name: "catalyst B",
            points: [
              [0, 0],
              [10, 6],
              [20, 12],
              [30, 18],
              [40, 25],
              [50, 31],
            ],
            lobf: "linear",
            marker: "triangle",
            color: "#ef4444",
          },
          {
            kind: "line",
            name: "catalyst C",
            points: [
              [0, 0],
              [10, 3],
              [20, 6],
              [30, 9],
              [40, 12],
              [50, 15],
            ],
            lobf: "linear",
            marker: "square",
            color: "#10b981",
            dashed: true,
          },
        ],
      },
    },
    question: [
      "Which catalyst gives the ",
      hi("fastest"),
      " initial rate of reaction?",
    ],
    layout: {
      type: "text-horizontal",
      options: {
        A: [b("A")],
        B: [b("B")],
        C: [b("C")],
        D: ["all equal"],
      },
    },
    answer: "A",
  },

  // Q15 — straight point-to-point (not smoothed, no LOBF), x-axis label only
  {
    n: 15,
    order: ["intro", "introData", "question"],
    intro: [
      "A student adds ",
      b("solid NaOH"),
      " to water in 1 g portions and measures the ",
      b("temperature rise"),
      " after each addition.",
    ],
    introData: {
      kind: "graph",
      spec: {
        xLabel: "mass of NaOH added / g",
        xMin: 0,
        xMax: 8,
        yMin: 0,
        yMax: 40,
        showLegend: false,
        series: [
          {
            kind: "line",
            points: [
              [0, 0],
              [1, 6],
              [2, 11],
              [3, 17],
              [4, 22],
              [5, 28],
              [6, 32],
              [7, 34],
              [8, 35],
            ],
            showPoints: true,
            marker: "circle",
            color: "#8b5cf6",
          },
        ],
      },
    },
    question: [
      "How does the ",
      hi("temperature rise per gram"),
      " change as more NaOH is added?",
    ],
    layout: {
      type: "text-vertical",
      options: {
        A: ["It is constant throughout."],
        B: ["It increases steadily."],
        C: ["It decreases as the total mass added grows."],
        D: ["It first decreases, then increases."],
      },
    },
    answer: "C",
  },

  // Q16 — curved point-to-point + reversible equation in intro
  {
    n: 16,
    order: ["intro", "introData", "question"],
    intro: [
      "The Contact process for making sulfur trioxide is a ",
      b("reversible"),
      " reaction:",
      br,
      { latex: "2SO_2(g) + O_2(g) \\rightleftharpoons 2SO_3(g)", display: true },
      "The graph below shows how the yield of ",
      primary("SO"),
      sub("3"),
      " changes with temperature at constant pressure.",
    ],
    introData: {
      kind: "graph",
      spec: {
        xLabel: "temperature / °C",
        yLabel: "yield of SO₃ / %",
        xMin: 300,
        xMax: 700,
        yMin: 0,
        yMax: 100,
        series: [
          {
            kind: "line",
            points: [
              [300, 98],
              [350, 95],
              [400, 90],
              [450, 82],
              [500, 70],
              [550, 55],
              [600, 38],
              [650, 22],
              [700, 12],
            ],
            smooth: true,
            showPoints: true,
            marker: "diamond",
            color: "#f59e0b",
            name: "yield",
          },
        ],
      },
    },
    question: [
      "What does the graph tell you about the ",
      b("forward"),
      " reaction?",
    ],
    layout: {
      type: "text-vertical",
      options: {
        A: ["It is exothermic — high T lowers the yield."],
        B: ["It is endothermic — high T lowers the yield."],
        C: ["It is exothermic — high T raises the yield."],
        D: ["Temperature has no effect on the equilibrium position."],
      },
    },
    answer: "A",
  },

  // Q17 (dummy) — small image with bottom caption
  {
    n: 17,
    order: ["intro", "introData", "question"],
    intro: [
      "The diagram below shows a piece of laboratory ",
      b("apparatus"),
      " commonly used to measure gas volumes.",
    ],
    introData: {
      kind: "image",
      size: "sm",
      captionPosition: "bottom",
      image: { src: apparatusA, alt: "Apparatus A diagram", invertOnDark: true },
      caption: [b("Fig. 17.1"), " — Small-sized apparatus diagram with a caption below."],
    },
    question: ["Which piece of apparatus is shown?"],
    layout: {
      type: "text-vertical",
      options: {
        A: ["Gas syringe"],
        B: ["Measuring cylinder"],
        C: ["Burette"],
        D: ["Pipette"],
      },
    },
    answer: "A",
  },

  // Q18 (dummy) — medium image with top caption
  {
    n: 18,
    order: ["introData", "question"],
    introData: {
      kind: "image",
      size: "md",
      captionPosition: "top",
      image: { src: apparatusB, alt: "Apparatus B diagram", invertOnDark: true },
      caption: [b("Fig. 18.1"), " — Medium-sized apparatus diagram with a caption above."],
    },
    question: [
      "Which apparatus is ",
      hi("most suitable"),
      " for accurately delivering variable volumes of a liquid?",
    ],
    layout: {
      type: "text-horizontal",
      options: {
        A: ["Beaker"],
        B: ["Burette"],
        C: ["Flask"],
        D: ["Test tube"],
      },
    },
    answer: "B",
  },

  // Q19 (dummy) — large image (no caption)
  {
    n: 19,
    order: ["intro", "introData", "question"],
    intro: [
      "A large-scale schematic of an ",
      b("atom"),
      " is shown below.",
    ],
    introData: {
      kind: "image",
      size: "lg",
      image: { src: atomDiagram, alt: "Atom diagram (large)", invertOnDark: true },
    },
    question: ["Which region of the atom contains almost all of its mass?"],
    layout: {
      type: "text-2x2",
      options: {
        A: ["The nucleus"],
        B: ["The electron cloud"],
        C: ["The outer shell"],
        D: ["Empty space between shells"],
      },
    },
    answer: "A",
  },

  // Q20 (dummy) — image WITHOUT dark-mode invert filter
  {
    n: 20,
    order: ["intro", "introData", "question"],
    intro: [
      "The molecule below is drawn using its ",
      b("standard colours"),
      " — the image should ",
      hi("not"),
      " be inverted in dark mode.",
    ],
    introData: {
      kind: "image",
      size: "md",
      captionPosition: "bottom",
      image: { src: molecule, alt: "Molecule (no invert)", invertOnDark: false },
      caption: [b("Fig. 20.1"), " — Coloured molecule shown as-is in dark mode."],
    },
    question: ["This diagram is best described as a:"],
    layout: {
      type: "text-vertical",
      options: {
        A: ["Ball-and-stick model"],
        B: ["Space-filling model"],
        C: ["Skeletal formula"],
        D: ["Electron-dot diagram"],
      },
    },
    answer: "A",
  },

  // Q21 (dummy) — image WITH the invert filter (for contrast on dark backgrounds)
  {
    n: 21,
    order: ["intro", "introData", "question"],
    intro: [
      "The line-diagram apparatus below is drawn in black on white — the ",
      hi("invert filter"),
      " should flip it for dark mode.",
    ],
    introData: {
      kind: "image",
      size: "md",
      captionPosition: "bottom",
      image: { src: apparatusC, alt: "Apparatus C (inverted in dark mode)", invertOnDark: true },
      caption: [b("Fig. 21.1"), " — Line diagram with the CSS invert filter applied in dark mode."],
    },
    question: ["What is the primary purpose of the apparatus shown?"],
    layout: {
      type: "text-vertical",
      options: {
        A: ["Distillation"],
        B: ["Filtration"],
        C: ["Titration"],
        D: ["Chromatography"],
      },
    },
    answer: "A",
  },

  // Q22 (dummy) — list intro + text-refs option layout (hover highlights list items)
  {
    n: 22,
    order: ["intro", "introData", "question"],
    intro: [
      "Living organisms carry out many characteristic processes. Three of them are listed below.",
    ],
    introData: {
      kind: "list",
      ordered: true,
      items: [
        ["digestion"],
        ["respiration"],
        ["excretion"],
      ],
    },
    question: [
      "Which of the processes are carried out by ",
      b("all"),
      " living organisms?",
    ],
    layout: {
      type: "text-refs",
      orientation: "horizontal",
      options: {
        A: { label: ["1, 2 and 3"], refs: [0, 1, 2] },
        B: { label: ["1 only"], refs: [0] },
        C: { label: ["2 and 3 only"], refs: [1, 2] },
        D: { label: ["2 only"], refs: [1] },
      },
    },
    answer: "A",
  },
];