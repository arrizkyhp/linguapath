declare module "kokoro-js" {
  interface KokoroTTS {
    generate(text: string, options?: { voice?: string }): Promise<Float32Array>;
  }

  export const KokoroTTS: {
    from_pretrained(
      model_id: string,
      options?: {
        dtype?: string;
        device?: string;
        progress_callback?: (progress: any) => void;
      }
    ): Promise<KokoroTTS>;
  };

  export const env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
}
