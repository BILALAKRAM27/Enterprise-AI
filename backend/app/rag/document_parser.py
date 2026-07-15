import fitz  # PyMuPDF
import docx
from fastapi import UploadFile
import tempfile
import os

class DocumentParser:
    @staticmethod
    async def extract_text(upload_file: UploadFile, file_type: str) -> str:
        # Read file contents into a temp file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, upload_file.filename)
        
        try:
            with open(temp_path, "wb") as f:
                f.write(await upload_file.read())

            if file_type.lower() == "pdf":
                return DocumentParser._parse_pdf(temp_path)
            elif file_type.lower() in ["docx", "doc"]:
                return DocumentParser._parse_docx(temp_path)
            elif file_type.lower() == "txt":
                return DocumentParser._parse_txt(temp_path)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        return text
        
    @staticmethod
    def _parse_docx(file_path: str) -> str:
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
        
    @staticmethod
    def _parse_txt(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
