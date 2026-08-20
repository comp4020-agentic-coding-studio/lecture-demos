// The sensor's geometry. Its own module because both the scene and the colour
// filter array need it, and neither should have to import the other.

/** Sensor resolution, in cells. Every buffer in the simulation is this size. */
export const WIDTH = 220;
export const HEIGHT = 140;
export const CELLS = WIDTH * HEIGHT;
