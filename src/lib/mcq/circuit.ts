import type { RichNode } from "./rich";

export type CircuitComponentType =
  | "wire"
  | "cell"
  | "battery"
  | "batteryDashed"
  | "powerSupply"
  | "dcPower"
  | "acPower"
  | "fixedResistor"
  | "variableResistor"
  | "thermistor"
  | "ldr"
  | "heater"
  | "potentialDivider"
  | "transformer"
  | "magnetisingCoil"
  | "switch"
  | "earth"
  | "junction"
  | "lamp"
  | "motor"
  | "generator"
  | "ammeter"
  | "voltmeter"
  | "diode"
  | "led"
  | "fuse"
  | "relayCoil"
  | "electricBell";

export const CIRCUIT_COMPONENT_NAMES: Record<CircuitComponentType, string> = {
  wire: "Wire",
  cell: "Cell",
  battery: "Battery of cells",
  batteryDashed: "Battery of cells (extended)",
  powerSupply: "Power supply",
  dcPower: "D.C. power supply",
  acPower: "A.C. power supply",
  fixedResistor: "Fixed resistor",
  variableResistor: "Variable resistor",
  thermistor: "Thermistor",
  ldr: "Light-dependent resistor",
  heater: "Heater",
  potentialDivider: "Potential divider",
  transformer: "Transformer",
  magnetisingCoil: "Magnetising coil",
  switch: "Switch",
  earth: "Earth or ground",
  junction: "Junction of conductors",
  lamp: "Lamp",
  motor: "Motor",
  generator: "Generator",
  ammeter: "Ammeter",
  voltmeter: "Voltmeter",
  diode: "Diode",
  led: "Light-emitting diode",
  fuse: "Fuse",
  relayCoil: "Relay coil",
  electricBell: "Electric bell",
};

export type CircuitLabelPosition = "top" | "bottom" | "left" | "right";
export type CircuitSide = "top" | "right" | "bottom" | "left";

export type CircuitComponent = {
  id: string;
  kind: "component";
  type: CircuitComponentType;
  label?: RichNode[];
  labelPosition?: CircuitLabelPosition;
  /** Raw hex color for the symbol strokes. */
  color?: string;
  /** Use theme --primary color for the symbol. */
  themeColor?: boolean;
};

/** A parallel group is a set of branches; each branch is a series of components. */
export type CircuitParallel = {
  id: string;
  kind: "parallel";
  branches: CircuitComponent[][];
};

export type CircuitItem = CircuitComponent | CircuitParallel;

export type CircuitFreeLabel = {
  id: string;
  content: RichNode[];
  /** Position relative to the drawing area, 0-100. */
  xPct: number;
  yPct: number;
  color?: string;
  themeColor?: boolean;
};

export type CircuitSpec = {
  /** Items assigned to each side of the rectangular loop, in perimeter order. */
  sides: Record<CircuitSide, CircuitItem[]>;
  freeLabels?: CircuitFreeLabel[];
  /** Overall pixel width / height of the drawing area. */
  width?: number;
  height?: number;
};

let __cid = 0;
export const newCircuitId = () => `c${Date.now().toString(36)}${(__cid++).toString(36)}`;

export function makeComponent(
  type: CircuitComponentType,
  patch: Partial<CircuitComponent> = {},
): CircuitComponent {
  return { id: newCircuitId(), kind: "component", type, ...patch };
}

export function makeParallel(branches?: CircuitComponent[][]): CircuitParallel {
  return {
    id: newCircuitId(),
    kind: "parallel",
    branches: branches ?? [[makeComponent("fixedResistor")], [makeComponent("fixedResistor")]],
  };
}

export function defaultCircuit(): CircuitSpec {
  return {
    sides: {
      top: [makeComponent("switch")],
      right: [makeComponent("fixedResistor")],
      bottom: [makeComponent("lamp")],
      left: [makeComponent("cell")],
    },
    freeLabels: [],
    width: 420,
    height: 300,
  };
}
