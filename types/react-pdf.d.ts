declare module 'react-pdf' {
  export interface DocumentProps {
    file: string | File | ArrayBuffer | null;
    onLoadSuccess?: (pdf: { numPages: number }) => void;
    onLoadError?: (error: Error) => void;
    loading?: React.ReactNode;
    children?: React.ReactNode;
  }

  export interface PageProps {
    pageNumber: number;
    scale?: number;
    loading?: React.ReactNode;
  }

  export const Document: React.FC<DocumentProps>;
  export const Page: React.FC<PageProps>;

  export namespace pdfjs {
    export namespace GlobalWorkerOptions {
      export let workerSrc: string;
    }
  }
}
