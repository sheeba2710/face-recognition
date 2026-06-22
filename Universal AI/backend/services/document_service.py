import os
from pypdf import PdfReader

class DocumentService:
    @staticmethod
    def extract_text_from_pdf(file_path):
        """Extract text content from a PDF document"""
        try:
            if not os.path.exists(file_path):
                return ""
            
            reader = PdfReader(file_path)
            text = []
            
            # Limit to first 25 pages to prevent token exhaustion and slow speeds
            max_pages = min(len(reader.pages), 25)
            for i in range(max_pages):
                page_text = reader.pages[i].extract_text()
                if page_text:
                    text.append(page_text)
                    
            if len(reader.pages) > 25:
                text.append(f"\n[Truncated: PDF has {len(reader.pages)} pages, processed first 25 pages]")
                
            return "\n".join(text)
        except Exception as e:
            return f"Error extracting text from PDF: {str(e)}"

    @staticmethod
    def allowed_file(filename, allowed_extensions):
        """Check if file has an allowed extension"""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in allowed_extensions
