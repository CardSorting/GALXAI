import { NextRequest, NextResponse } from 'next/server';
import { ModelCatalog } from '@/core/router/ModelCatalog';

export const runtime = 'nodejs';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * Native Ollama-Compatible POST /api/show Endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const modelName = body.name || body.model || 'gpt-5.6-sol';
    const spec = ModelCatalog.resolveModel(modelName);

    return NextResponse.json({
      license: 'GALXAI Commercial Enterprise License',
      modelfile: `# Modelfile generated for GALXAI ${spec.name}\nFROM ${spec.upstreamId}\nPARAMETER temperature 0.7\nPARAMETER stop "<|im_end|>"`,
      parameters: 'temperature 0.7\nnum_ctx ' + spec.contextWindowTokens,
      template: '{{ .System }}\nUSER: {{ .Prompt }}\nASSISTANT: ',
      details: {
        parent_model: '',
        format: 'gguf',
        family: spec.category === 'llm' ? 'frontier' : spec.category,
        families: [spec.provider],
        parameter_size: spec.contextWindowTokens > 500000 ? 'frontier-1m' : 'frontier',
        quantization_level: 'f16'
      },
      model_info: {
        'general.architecture': 'frontier-transformer',
        'general.file_type': 1,
        'general.name': spec.name,
        'context_length': spec.contextWindowTokens,
        'max_output_tokens': spec.maxOutputTokens
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error showing model' }, { status: 500 });
  }
}
