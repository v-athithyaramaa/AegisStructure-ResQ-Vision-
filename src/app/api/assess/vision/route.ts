import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    placard_status: {
      type: SchemaType.STRING,
      enum: ["GREEN_INSPECTED", "YELLOW_RESTRICTED", "RED_UNSAFE"],
      description: "ATC-20 placard status based on safety assessment",
    },
    residual_capacity_score: {
      type: SchemaType.NUMBER,
      description: "Float representing % strength remaining (e.g. 35.50)",
    },
    confidence_score: {
      type: SchemaType.INTEGER,
      description: "Confidence in diagnostic extraction 0-100",
    },
    tilt_degrees: {
      type: SchemaType.NUMBER,
      description: "Lateral angular lean in degrees",
    },
    collapse_radius_meters: {
      type: SchemaType.NUMBER,
      description: "Stand-off exclusion zone radius in meters (R_collapse = 1.5 * H_structure * sin(tilt) + safety margin min 10m)",
    },
    structural_archetype: {
      type: SchemaType.STRING,
      description: "Type of structural system (e.g. 'Reinforced Concrete Frame')",
    },
    detected_defects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          element: { type: SchemaType.STRING },
          failure: { type: SchemaType.STRING },
          severity: { type: SchemaType.INTEGER, description: "1-5 scale" },
          rebar_exposed: { type: SchemaType.BOOLEAN },
        },
        required: ["element", "failure", "severity", "rebar_exposed"],
      },
    },
    incident_action_plan: {
      type: SchemaType.STRING,
      description: "Actionable tactical advice for first responders",
    },
  },
  required: [
    "placard_status",
    "residual_capacity_score",
    "confidence_score",
    "tilt_degrees",
    "collapse_radius_meters",
    "structural_archetype",
    "detected_defects",
    "incident_action_plan",
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, latitude, longitude, buildingName } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'Missing imageBase64' }, { status: 400 });
    }

    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json({ success: false, error: 'Invalid imageBase64 format' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const prompt = `You are an expert civil engineer and USAR disaster response analyst evaluating a partially collapsed or damaged building.
Based on the provided image, estimate the structural stability using FEMA P-154 and ATC-20 guidelines.

Context:
- Building Name: ${buildingName}
- Coordinates: ${latitude}, ${longitude}

Provide a structured assessment including:
- Residual Capacity Ratio (RCR) %
- Diagnostic Confidence Score (0-100)
- Placard Status (GREEN_INSPECTED > 75%, YELLOW_RESTRICTED 40-75%, RED_UNSAFE < 40%)
- Tilt degrees
- Collapse radius (min 10m)
- Structural archetype
- Detected defects with severity (1-5) and exposed rebar status
- Incident action plan for first responders`;

    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash"
    ];

    let response;
    let lastError;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            responseSchema: responseSchema as any,
          },
        });

        response = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
        ]);
        
        break; // If successful, break out of the loop
      } catch (err: any) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
      }
    }

    if (!response) {
      throw lastError || new Error("All Gemini models failed to generate content.");
    }

    const text = response.response.text();
    if (!text) {
        throw new Error("No response text from Gemini");
    }

    const parsedData = JSON.parse(text);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
