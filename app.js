/**
 * PSYCHROMETRIC CALCULATOR - Full Implementation
 * Modular JavaScript Application with Psychrometric Chart Visualization
 * 
 * This application computes all thermodynamic properties of moist air
 * given any two independent state variables, and plots the result on a
 * psychrometric chart for 1 atm (101325 Pa).
 * 
 * References:
 * - ASHRAE Fundamentals Handbook (SI)
 * - Magnus formula for saturation pressure (Lawrence, 2005)
 * - Psychrometric relations (ISO/IEC standards)
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONSTANTS = {
    // Gas constant for dry air [J/(kg·K)]
    R_DA: 287.058,
    // Specific heat of dry air [kJ/(kg·K)]
    C_DA: 1.006,
    // Latent heat of vaporization at 0°C [kJ/kg]
    H_FG_0: 2501,
    // Temperature coefficient for latent heat [kJ/(kg·K)]
    H_FG_T: 1.86,
    // Humidity ratio factor
    K_W: 0.622,
    // Standard atmospheric pressure [Pa]
    P_STD: 101325,
    // Gas constant for water vapor [J/(kg·K)]
    R_V: 461.52,
};

/**
 * Variable explanations in French
 * Each entry provides a clear, scientific description
 */
const VARIABLE_EXPLANATIONS = {
    tdb: {
        name: "Température sèche (Tdb)",
        unit: "°C",
        explanation: "La température mesurée par un thermomètre classique. C'est la température de l'air sec sans tenir compte de l'humidité. Celle-ci est une variable indépendante fondamentale pour définir l'état de l'air humide."
    },
    w: {
        name: "Ratio d'humidité (W)",
        unit: "kg_w/kg_da",
        explanation: "La masse de vapeur d'eau contenue dans 1 kg d'air sec. C'est une mesure absolue de l'humidité, indépendante de la température. Toujours compris entre 0 (air sec) et W_sat (air saturé à la température donnée)."
    },
    rh: {
        name: "Humidité relative (RH)",
        unit: "%",
        explanation: "Le rapport entre la pression de vapeur actuelle et la pression de saturation à la même température, exprimé en pourcentage. Varie de 0% (air sec) à 100% (air saturé). Dépend fortement de la température."
    },
    h: {
        name: "Enthalpie (h)",
        unit: "kJ/kg_da",
        explanation: "L'énergie totale du système de l'air humide par unité de masse d'air sec. Elle inclut l'énergie thermique de l'air sec et l'énergie latente de la vapeur d'eau. Utilisée pour les calculs de chauffage/refroidissement."
    },
    twb: {
        name: "Température humide (Twb)",
        unit: "°C",
        explanation: "La température lue par un thermomètre mouillé exposé à l'air en mouvement. Elle représente la température atteinte par évaporation adiabatique de l'eau. Toujours inférieure ou égale à la température sèche."
    },
    tdp: {
        name: "Température de rosée (Tdp)",
        unit: "°C",
        explanation: "La température à laquelle l'air devient saturé en eau si refroidi isobariquement sans échange d'humidité. En dessous de cette température, la condensation commence. Plus elle est élevée, plus l'air est humide."
    },
    pv: {
        name: "Pression de vapeur (Pv)",
        unit: "Pa",
        explanation: "La pression partielle de la vapeur d'eau dans l'air humide. Elle est toujours inférieure à la pression de saturation correspondant à la température actuelle. Contrôle le taux d'évaporation et de condensation."
    },
    m_da: {
        name: "Débit masse air sec (ṁ_da)",
        unit: "kg/s",
        explanation: "La masse d'air sec qui circule par unité de temps. Utilisée pour les calculs de flux d'énergie dans les systèmes CVC. Permet de calculer le débit volumétrique à partir de la densité."
    },
    v_dot: {
        name: "Débit volumétrique (V̇)",
        unit: "m³/h",
        explanation: "Le volume d'air humide qui circule par unité de temps. Lié au débit masse par la densité. Utilisé couramment en génie climatique pour dimensionner les conduits et ventilateurs."
    }
};

let appState = {
    precision: 4,
    var1: null,
    var2: null,
    val1: null,
    val2: null,
    m_da_ref: 1.0,
    p_total: 101325,
    results: null,
    error: null,
};

// ============================================================================
// THERMODYNAMIC FUNCTIONS
// ============================================================================

/**
 * Magnus formula for saturation vapor pressure over liquid water
 * Valid range: -50°C to +200°C
 * 
 * Reference: Lawrence, M. G. (2005). The relationship between relative humidity 
 * and the dewpoint temperature in moist air: A simple conversion and applications. 
 * Bull. Amer. Meteor. Soc., 86, 225–233.
 * 
 * @param {number} T - Temperature [°C]
 * @returns {number} Saturation vapor pressure [Pa]
 */
function saturationVaporPressure(T) {
    // For T >= 0°C: Magnus formula
    const a = 17.27;
    const b = 237.7; // [°C]
    const p_ref = 611.2; // [Pa] reference pressure at 0°C
    
    const exponent = (a * T) / (b + T);
    return p_ref * Math.exp(exponent);
}

/**
 * Inverse Magnus formula: find temperature given saturation pressure
 * 
 * @param {number} p_sat - Saturation vapor pressure [Pa]
 * @returns {number} Temperature [°C]
 */
function temperatureFromSaturationPressure(p_sat) {
    const a = 17.27;
    const b = 237.7; // [°C]
    const p_ref = 611.2; // [Pa]
    
    const ratio = Math.log(p_sat / p_ref);
    return (b * ratio) / (a - ratio);
}

/**
 * Compute humidity ratio from vapor pressure and dry-air partial pressure
 * W = 0.622 * Pv / (P_total - Pv)
 * 
 * @param {number} Pv - Vapor pressure [Pa]
 * @param {number} P_total - Total pressure [Pa]
 * @returns {number} Humidity ratio [kg_w/kg_da]
 */
function humidityRatioFromVaporPressure(Pv, P_total) {
    if (Pv >= P_total) return Infinity;
    return CONSTANTS.K_W * Pv / (P_total - Pv);
}

/**
 * Inverse: compute vapor pressure from humidity ratio
 * Pv = P_total * W / (0.622 + W)
 * 
 * @param {number} W - Humidity ratio [kg_w/kg_da]
 * @param {number} P_total - Total pressure [Pa]
 * @returns {number} Vapor pressure [Pa]
 */
function vaporPressureFromHumidityRatio(W, P_total) {
    return P_total * W / (CONSTANTS.K_W + W);
}

/**
 * Compute relative humidity from vapor pressure and saturation pressure
 * RH = 100 * Pv / p_sat(T)
 * 
 * @param {number} Pv - Vapor pressure [Pa]
 * @param {number} T - Temperature [°C]
 * @returns {number} Relative humidity [%]
 */
function relativeHumidity(Pv, T) {
    const p_sat = saturationVaporPressure(T);
    return 100 * Pv / p_sat;
}

/**
 * Compute saturation humidity ratio
 * W_sat = 0.622 * p_sat(T) / (P_total - p_sat(T))
 * 
 * @param {number} T - Temperature [°C]
 * @param {number} P_total - Total pressure [Pa]
 * @returns {number} Saturation humidity ratio [kg_w/kg_da]
 */
function saturationHumidityRatio(T, P_total) {
    const p_sat = saturationVaporPressure(T);
    return humidityRatioFromVaporPressure(p_sat, P_total);
}

/**
 * Compute enthalpy of moist air
 * h = c_da * T + W * (h_fg_0 + h_fg_T * T)
 * 
 * Reference: ASHRAE Fundamentals (SI)
 * 
 * @param {number} T - Dry-bulb temperature [°C]
 * @param {number} W - Humidity ratio [kg_w/kg_da]
 * @returns {number} Enthalpy [kJ/kg_da]
 */
function enthalpy(T, W) {
    const h_fg = CONSTANTS.H_FG_0 + CONSTANTS.H_FG_T * T;
    return CONSTANTS.C_DA * T + W * h_fg;
}

/**
 * Compute wet-bulb temperature using iterative root-finding
 * Uses bisection method with safeguards.
 * 
 * @param {number} Tdb - Dry-bulb temperature [°C]
 * @param {number} W - Humidity ratio [kg_w/kg_da]
 * @param {number} P_total - Total pressure [Pa]
 * @returns {number} Wet-bulb temperature [°C]
 */
function wetBulbTemperature(Tdb, W, P_total) {
    const h_target = enthalpy(Tdb, W);
    
    const p_v = vaporPressureFromHumidityRatio(W, P_total);
    const T_dew = temperatureFromSaturationPressure(p_v);
    
    let T_low = Math.max(T_dew - 5, -50);
    let T_high = Tdb;
    
    const tolerance = 0.001; // [°C]
    const maxIterations = 50;
    let iterations = 0;
    
    while (T_high - T_low > tolerance && iterations < maxIterations) {
        const T_mid = (T_low + T_high) / 2;
        const W_sat_mid = saturationHumidityRatio(T_mid, P_total);
        const h_mid = enthalpy(T_mid, W_sat_mid);
        
        if (h_mid < h_target) {
            T_low = T_mid;
        } else {
            T_high = T_mid;
        }
        
        iterations++;
    }
    
    return (T_low + T_high) / 2;
}

/**
 * Compute density of moist air
 * ρ = P_total / (R_mix * T_K)
 * where R_mix = R_da * (1 + 1.6078*W) / (1 + W)
 * 
 * @param {number} Tdb - Dry-bulb temperature [°C]
 * @param {number} W - Humidity ratio [kg_w/kg_da]
 * @param {number} P_total - Total pressure [Pa]
 * @returns {number} Density [kg/m³]
 */
function density(Tdb, W, P_total) {
    const T_K = Tdb + 273.15;
    const R_mix = CONSTANTS.R_DA * (1 + 1.6078 * W) / (1 + W);
    return P_total / (R_mix * T_K);
}

/**
 * Compute volumetric flow rate from mass flow
 * V̇ = (ṁ_da / ρ) * 3.6  [converts m³/s to m³/h]
 * 
 * @param {number} m_da - Dry-air mass flow [kg/s]
 * @param {number} rho - Density [kg/m³]
 * @returns {number} Volumetric flow [m³/h]
 */
function volumetricFlow(m_da, rho) {
    return (m_da / rho) * 3.6;
}

// ============================================================================
// SOLVER: Given Two Independent Variables
// ============================================================================

function solveState(inputs) {
    const { var1, val1, var2, val2, P_total, m_da_ref } = inputs;
    
    if (!var1 || !var2 || val1 === null || val2 === null) {
        throw new Error("Sélectionnez deux variables et entrez les valeurs.");
    }
    
    if (var1 === var2) {
        throw new Error("Les deux variables indépendantes doivent être différentes.");
    }

    const vars = [var1, var2].sort();
    const pair = vars.join("+");
    
    let state = {};
    
    // Pair-based resolution
    if (pair === "rh+tdb") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const RH = var1 === "rh" ? val1 : val2;
        state = solveFromTdbRH(Tdb, RH, P_total);
    } else if (pair === "tdb+w") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const W = var1 === "w" ? val1 : val2;
        state = solveFromTdbW(Tdb, W, P_total);
    } else if (pair === "h+tdb") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const h_val = var1 === "h" ? val1 : val2;
        state = solveFromTdbH(Tdb, h_val, P_total);
    } else if (pair === "tdb+twb") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const Twb = var1 === "twb" ? val1 : val2;
        state = solveFromTdbTwb(Tdb, Twb, P_total);
    } else if (pair === "tdp+tdb") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const Tdp = var1 === "tdp" ? val1 : val2;
        state = solveFromTdbTdp(Tdb, Tdp, P_total);
    } else if (pair === "h+w") {
        const W = var1 === "w" ? val1 : val2;
        const h_val = var1 === "h" ? val1 : val2;
        state = solveFromWH(W, h_val, P_total);
    } else if (pair === "pv+tdb") {
        const Tdb = var1 === "tdb" ? val1 : val2;
        const Pv = var1 === "pv" ? val1 : val2;
        state = solveFromTdbPv(Tdb, Pv, P_total);
    } else if (pair === "rh+w") {
        const RH = var1 === "rh" ? val1 : val2;
        const W = var1 === "w" ? val1 : val2;
        state = solveFromRHW(RH, W, P_total);
    } else {
        throw new Error(`Paire non implémentée: ${var1} + ${var2}`);
    }

    if (!state || state.Tdb === undefined) {
        throw new Error("Impossible de résoudre cet état (état physiquement impossible).");
    }

    let m_da = m_da_ref;
    if (var1 === "m_da" || var2 === "m_da") {
        m_da = var1 === "m_da" ? val1 : val2;
    }
    
    let V_dot = volumetricFlow(m_da, state.rho);
    if (var1 === "v_dot" || var2 === "v_dot") {
        V_dot = var1 === "v_dot" ? val1 : val2;
        m_da = (V_dot / 3.6) * state.rho;
    }

    state.m_da = m_da;
    state.V_dot = V_dot;
    state.P_total = P_total;

    return state;
}

// Individual pair solvers
function solveFromTdbRH(Tdb, RH, P_total) {
    if (RH < 0 || RH > 100) {
        throw new Error("L'humidité relative doit être entre 0 et 100%.");
    }
    
    const p_sat = saturationVaporPressure(Tdb);
    const Pv = (RH / 100) * p_sat;
    const W = humidityRatioFromVaporPressure(Pv, P_total);
    
    if (W < 0) {
        throw new Error("État thermodynamiquement impossible.");
    }

    const h = enthalpy(Tdb, W);
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h, Twb, T_dew, Pv, rho, P_total };
}

function solveFromTdbW(Tdb, W, P_total) {
    if (W < 0) {
        throw new Error("Le ratio d'humidité ne peut pas être négatif.");
    }

    const Pv = vaporPressureFromHumidityRatio(W, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;

    if (RH > 100.5) {
        throw new Error("État sursaturé (non physique).");
    }

    const h = enthalpy(Tdb, W);
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH: Math.min(RH, 100), h, Twb, T_dew, Pv, rho, P_total };
}

function solveFromTdbH(Tdb, h_target, P_total) {
    const W_max = saturationHumidityRatio(Tdb, P_total);
    
    let W_low = 0;
    let W_high = W_max;
    const tolerance = 1e-6;
    const maxIterations = 100;
    let iterations = 0;

    while (W_high - W_low > tolerance && iterations < maxIterations) {
        const W_mid = (W_low + W_high) / 2;
        const h_mid = enthalpy(Tdb, W_mid);
        
        if (h_mid < h_target) {
            W_low = W_mid;
        } else {
            W_high = W_mid;
        }
        iterations++;
    }

    const W = (W_low + W_high) / 2;
    const Pv = vaporPressureFromHumidityRatio(W, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h: h_target, Twb, T_dew, Pv, rho, P_total };
}

function solveFromTdbTwb(Tdb, Twb, P_total) {
    if (Twb > Tdb) {
        throw new Error("La température humide ne peut pas dépasser la température sèche.");
    }

    const W_sat_wb = saturationHumidityRatio(Twb, P_total);
    const h_target = enthalpy(Twb, W_sat_wb);
    
    const W_sat = saturationHumidityRatio(Tdb, P_total);
    let W_low = 0;
    let W_high = W_sat;
    const tolerance = 1e-6;
    const maxIterations = 100;
    let iterations = 0;

    while (W_high - W_low > tolerance && iterations < maxIterations) {
        const W_mid = (W_low + W_high) / 2;
        const h_mid = enthalpy(Tdb, W_mid);
        
        if (h_mid < h_target) {
            W_low = W_mid;
        } else {
            W_high = W_mid;
        }
        iterations++;
    }

    const W = (W_low + W_high) / 2;
    const Pv = vaporPressureFromHumidityRatio(W, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;
    const h = enthalpy(Tdb, W);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h, Twb, T_dew, Pv, rho, P_total };
}

function solveFromTdbTdp(Tdb, Tdp, P_total) {
    if (Tdp > Tdb + 0.1) {
        throw new Error("La température de rosée ne peut pas dépasser la température sèche.");
    }

    const Pv = saturationVaporPressure(Tdp);
    const W = humidityRatioFromVaporPressure(Pv, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;
    const h = enthalpy(Tdb, W);
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h, Twb, T_dew: Tdp, Pv, rho, P_total };
}

function solveFromWH(W, h_target, P_total) {
    let T_low = -50;
    let T_high = 100;
    const tolerance = 0.01;
    const maxIterations = 100;
    let iterations = 0;

    while (T_high - T_low > tolerance && iterations < maxIterations) {
        const T_mid = (T_low + T_high) / 2;
        const h_mid = enthalpy(T_mid, W);
        
        if (h_mid < h_target) {
            T_low = T_mid;
        } else {
            T_high = T_mid;
        }
        iterations++;
    }

    const Tdb = (T_low + T_high) / 2;
    const Pv = vaporPressureFromHumidityRatio(W, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h: h_target, Twb, T_dew, Pv, rho, P_total };
}

function solveFromTdbPv(Tdb, Pv, P_total) {
    const W = humidityRatioFromVaporPressure(Pv, P_total);
    const p_sat = saturationVaporPressure(Tdb);
    const RH = 100 * Pv / p_sat;

    if (RH > 100.5) {
        throw new Error("État sursaturé (pression de vapeur trop élevée).");
    }

    const h = enthalpy(Tdb, W);
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH: Math.min(RH, 100), h, Twb, T_dew, Pv, rho, P_total };
}

function solveFromRHW(RH, W, P_total) {
    const Pv = vaporPressureFromHumidityRatio(W, P_total);
    const p_sat_target = 100 * Pv / RH;
    const Tdb = temperatureFromSaturationPressure(p_sat_target);

    const h = enthalpy(Tdb, W);
    const Twb = wetBulbTemperature(Tdb, W, P_total);
    const T_dew = temperatureFromSaturationPressure(Pv);
    const rho = density(Tdb, W, P_total);

    return { Tdb, W, RH, h, Twb, T_dew, Pv, rho, P_total };
}

// ============================================================================
// PSYCHROMETRIC CHART VISUALIZATION
// ============================================================================

/**
 * Generate a psychrometric chart at 1 atm (101325 Pa)
 * Plots saturation curve and grid lines
 */
function drawPsychrometricChart(state) {
    const canvas = document.getElementById("psychrometricChart");
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, w, h);
    
    // Temperature range: -10 to 50°C, W range: 0 to 0.03 kg/kg
    const T_min = -10, T_max = 50;
    const W_min = 0, W_max = 0.03;
    
    const marginLeft = 60, marginBottom = 60, marginTop = 30, marginRight = 30;
    const chartWidth = w - marginLeft - marginRight;
    const chartHeight = h - marginBottom - marginTop;
    
    // Helper functions to convert physical to canvas coordinates
    const toCanvasX = (T) => marginLeft + ((T - T_min) / (T_max - T_min)) * chartWidth;
    const toCanvasY = (W) => h - marginBottom - ((W - W_min) / (W_max - W_min)) * chartHeight;
    
    // Draw grid
    ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
    ctx.lineWidth = 0.5;
    
    // Temperature grid
    for (let T = T_min; T <= T_max; T += 5) {
        const x = toCanvasX(T);
        ctx.beginPath();
        ctx.moveTo(x, marginTop);
        ctx.lineTo(x, h - marginBottom);
        ctx.stroke();
    }
    
    // W grid
    for (let W = 0; W <= W_max; W += 0.005) {
        const y = toCanvasY(W);
        ctx.beginPath();
        ctx.moveTo(marginLeft, y);
        ctx.lineTo(w - marginRight, y);
        ctx.stroke();
    }
    
    // Draw saturation curve (blue)
    ctx.strokeStyle = "rgb(0, 100, 200)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    let firstPoint = true;
    
    for (let T = T_min; T <= T_max; T += 0.5) {
        const W_sat = saturationHumidityRatio(T, CONSTANTS.P_STD);
        if (W_sat > W_max) continue;
        
        const x = toCanvasX(T);
        const y = toCanvasY(W_sat);
        
        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Plot current point (red)
    if (state) {
        const x = toCanvasX(state.Tdb);
        const y = toCanvasY(state.W);
        
        ctx.fillStyle = "rgb(255, 50, 50)";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw a circle outline
        ctx.strokeStyle = "rgb(200, 0, 0)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Label the point
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font = "12px sans-serif";
        ctx.fillText(`(${state.Tdb.toFixed(1)}°C, ${state.W.toFixed(4)})`, x + 12, y - 10);
    }
    
    // Draw axes
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(marginLeft, marginTop);
    ctx.lineTo(marginLeft, h - marginBottom);
    ctx.lineTo(w - marginRight, h - marginBottom);
    ctx.stroke();
    
    // Axis labels
    ctx.fillStyle = "black";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Température sèche [°C]", w / 2, h - 10);
    
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Ratio d'humidité [kg_w/kg_da]", 0, 0);
    ctx.restore();
    
    // Axis ticks and labels
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    for (let T = T_min; T <= T_max; T += 5) {
        const x = toCanvasX(T);
        ctx.fillText(T.toString(), x, h - marginBottom + 20);
    }
    
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let W = 0; W <= W_max; W += 0.005) {
        const y = toCanvasY(W);
        ctx.fillText(W.toFixed(3), marginLeft - 10, y);
    }
}

// ============================================================================
// FORMATTING & DISPLAY
// ============================================================================

function formatValue(value, precision = 4) {
    if (value === undefined || value === null) return "–";
    if (!isFinite(value)) return "∞";
    return value.toPrecision(precision);
}

function displayResults(state) {
    const tbody = document.getElementById("resultsBody");
    tbody.innerHTML = "";

    const resultDefs = [
        { key: "Tdb", label: "Température sèche", unit: "°C" },
        { key: "W", label: "Ratio d'humidité", unit: "kg_w/kg_da" },
        { key: "RH", label: "Humidité relative", unit: "%" },
        { key: "h", label: "Enthalpie", unit: "kJ/kg_da" },
        { key: "Twb", label: "Température humide", unit: "°C" },
        { key: "T_dew", label: "Température de rosée", unit: "°C" },
        { key: "rho", label: "Densité", unit: "kg/m³" },
        { key: "m_da", label: "Débit masse air sec", unit: "kg/s" },
        { key: "V_dot", label: "Débit volumétrique", unit: "m³/h" },
        { key: "Pv", label: "Pression de vapeur", unit: "Pa" },
    ];

    resultDefs.forEach(def => {
        const value = state[def.key];
        const tr = document.createElement("tr");
        
        // Get the short key for variable lookup
        let varKey = def.key.toLowerCase();
        if (def.key === "Tdb") varKey = "tdb";
        if (def.key === "W") varKey = "w";
        if (def.key === "RH") varKey = "rh";
        if (def.key === "h") varKey = "h";
        if (def.key === "Twb") varKey = "twb";
        if (def.key === "T_dew") varKey = "tdp";
        if (def.key === "m_da") varKey = "m_da";
        if (def.key === "V_dot") varKey = "v_dot";
        if (def.key === "Pv") varKey = "pv";
        if (def.key === "rho") varKey = "rho";
        
        const hasExplanation = VARIABLE_EXPLANATIONS[varKey];
        
        tr.innerHTML = `
            <td class="label">${def.label}</td>
            <td class="unit">${def.unit}</td>
            <td class="value">${formatValue(value, appState.precision)}</td>
            <td>${hasExplanation ? `<button class="info-btn" data-var="${varKey}">ℹ️</button>` : ""}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("results").style.display = "block";
    document.getElementById("errorBox").classList.remove("show");
    
    // Draw chart
    drawPsychrometricChart(state);
}

function showError(message) {
    document.getElementById("errorBox").textContent = message;
    document.getElementById("errorBox").classList.add("show");
    document.getElementById("results").style.display = "none";
    document.getElementById("successBox").classList.remove("show");
}

// ============================================================================
// MODAL & EXPLANATIONS
// ============================================================================

function showExplanation(varKey) {
    const info = VARIABLE_EXPLANATIONS[varKey];
    if (!info) return;
    
    document.getElementById("explanationTitle").textContent = info.name;
    document.getElementById("explanationText").innerHTML = `
        <strong>Unité:</strong> ${info.unit}<br><br>
        ${info.explanation}
    `;
    document.getElementById("explanationModal").classList.add("show");
}

function closeExplanation() {
    document.getElementById("explanationModal").classList.remove("show");
}

// ============================================================================
// SELF-TEST
// ============================================================================

const EXAMPLE_DATA = {
    inputs: { var1: "tdb", val1: 40.227, var2: "rh", val2: 50.456 },
    expected: {
        Tdb: 40.227,
        W: 0.024140,
        RH: 50.456,
        h: 102.590,
        Twb: 30.589,
        T_dew: 27.950,
    }
};

function runSelfTest() {
    const testResults = document.getElementById("testResults");
    testResults.innerHTML = "";

    const tests = [
        {
            name: "Tdb + RH → W",
            fn: () => {
                const state = solveState({
                    var1: "tdb", val1: 40.227,
                    var2: "rh", val2: 50.456,
                    P_total: 101325,
                    m_da_ref: 1.0
                });
                const match = Math.abs(state.W - 0.024140) < 0.001;
                return { pass: match, actual: state.W, expected: 0.024140 };
            }
        },
        {
            name: "Tdb + RH → h",
            fn: () => {
                const state = solveState({
                    var1: "tdb", val1: 40.227,
                    var2: "rh", val2: 50.456,
                    P_total: 101325,
                    m_da_ref: 1.0
                });
                const match = Math.abs(state.h - 102.590) < 2;
                return { pass: match, actual: state.h, expected: 102.590 };
            }
        },
        {
            name: "Tdb + RH → Twb",
            fn: () => {
                const state = solveState({
                    var1: "tdb", val1: 40.227,
                    var2: "rh", val2: 50.456,
                    P_total: 101325,
                    m_da_ref: 1.0
                });
                const match = Math.abs(state.Twb - 30.589) < 1;
                return { pass: match, actual: state.Twb, expected: 30.589 };
            }
        },
        {
            name: "Tdb + RH → Tdp",
            fn: () => {
                const state = solveState({
                    var1: "tdb", val1: 40.227,
                    var2: "rh", val2: 50.456,
                    P_total: 101325,
                    m_da_ref: 1.0
                });
                const match = Math.abs(state.T_dew - 27.950) < 1;
                return { pass: match, actual: state.T_dew, expected: 27.950 };
            }
        },
        {
            name: "Tdb + W → RH",
            fn: () => {
                const state = solveState({
                    var1: "tdb", val1: 40.227,
                    var2: "w", val2: 0.024140,
                    P_total: 101325,
                    m_da_ref: 1.0
                });
                const match = Math.abs(state.RH - 50.456) < 2;
                return { pass: match, actual: state.RH, expected: 50.456 };
            }
        }
    ];

    let passCount = 0;
    tests.forEach(test => {
        try {
            const result = test.fn();
            const className = result.pass ? "pass" : "fail";
            const icon = result.pass ? "✓" : "✗";
            const item = document.createElement("div");
            item.className = `test-item ${className}`;
            item.innerHTML = `
                <span class="test-icon">${icon}</span>
                <span>${test.name}: ${formatValue(result.actual, 4)} (attendu: ${formatValue(result.expected, 4)})</span>
            `;
            testResults.appendChild(item);
            if (result.pass) passCount++;
        } catch (e) {
            const item = document.createElement("div");
            item.className = "test-item fail";
            item.innerHTML = `<span class="test-icon">✗</span><span>${test.name}: ${e.message}</span>`;
            testResults.appendChild(item);
        }
    });

    testResults.classList.add("show");
    console.log(`✓ Tests: ${passCount}/${tests.length} réussis`);
}

// ============================================================================
// EVENT LISTENERS & UI SETUP
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
    // Calculate button
    document.getElementById("calcBtn").addEventListener("click", () => {
        try {
            appState.error = null;
            appState.results = solveState({
                var1: document.getElementById("var1").value,
                val1: parseFloat(document.getElementById("val1").value),
                var2: document.getElementById("var2").value,
                val2: parseFloat(document.getElementById("val2").value),
                P_total: parseFloat(document.getElementById("p_total").value),
                m_da_ref: parseFloat(document.getElementById("m_da_ref").value)
            });

            displayResults(appState.results);
            document.getElementById("successBox").classList.add("show");
            document.getElementById("successMsg").textContent = "Calcul réussi!";
        } catch (e) {
            showError(e.message);
        }
    });

    // Example button
    document.getElementById("exampleBtn").addEventListener("click", () => {
        document.getElementById("var1").value = "tdb";
        document.getElementById("val1").value = "40.227";
        document.getElementById("var2").value = "rh";
        document.getElementById("val2").value = "50.456";
        document.getElementById("calcBtn").click();
        runSelfTest();
    });

    // Advanced toggle
    document.getElementById("advToggle").addEventListener("click", () => {
        document.getElementById("advPanel").classList.toggle("open");
    });

    // Precision selector
    document.querySelectorAll(".precision-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".precision-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            appState.precision = parseInt(btn.dataset.prec);
            if (appState.results) {
                displayResults(appState.results);
            }
        });
    });

    // Tab switching
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.dataset.tab;
            
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`${tabName}-content`).classList.add("active");
            
            if (tabName === "chart" && appState.results) {
                setTimeout(() => drawPsychrometricChart(appState.results), 0);
            }
        });
    });

    // Variable selection validation
    document.getElementById("var1").addEventListener("change", () => {
        const v1 = document.getElementById("var1").value;
        const v2 = document.getElementById("var2").value;
        if (v1 && v1 === v2) {
            document.getElementById("var2").value = "";
            alert("Sélectionnez deux variables différentes.");
        }
    });

    document.getElementById("var2").addEventListener("change", () => {
        const v1 = document.getElementById("var1").value;
        const v2 = document.getElementById("var2").value;
        if (v2 && v1 === v2) {
            document.getElementById("var1").value = "";
            alert("Sélectionnez deux variables différentes.");
        }
    });

    // Modal handlers
    document.getElementById("resultsBody").addEventListener("click", (e) => {
        if (e.target.classList.contains("info-btn")) {
            const varKey = e.target.dataset.var;
            showExplanation(varKey);
        }
    });

    document.getElementById("closeModal").addEventListener("click", closeExplanation);
    document.getElementById("closeModalBtn").addEventListener("click", closeExplanation);
    
    document.getElementById("explanationModal").addEventListener("click", (e) => {
        if (e.target.id === "explanationModal") {
            closeExplanation();
        }
    });

    // Initialize
    console.log("✓ Calculateur Psychrométrique chargé");
    runSelfTest();
});
