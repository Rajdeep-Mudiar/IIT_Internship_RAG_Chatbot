from pypdf import PdfReader
import docx

def read_pdf(path):

    reader=PdfReader(path)

    text=""

    for page in reader.pages:

        text+=page.extract_text()

    return text


def read_docx(path):

    doc=docx.Document(path)

    text=""

    for para in doc.paragraphs:

        text+=para.text

    return text


def read_txt(path):

    with open(path,"r",encoding="utf8") as f:

        return f.read()