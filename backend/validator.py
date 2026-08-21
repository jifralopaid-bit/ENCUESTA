import re
from typing import Tuple, Optional

def extract_data_from_bot_response(text: str) -> Tuple[Optional[str], Optional[int], Optional[str]]:
    """
    Extrae el dígito verificador, edad y distrito del texto de respuesta del bot de Telegram.
    Limpia formato Markdown y maneja símbolos especiales.
    Retorna (control_digit, score/edad, location/distrito).
    """
    if not text:
        return None, None, None

    # 1. Limpia el texto primero: elimina los caracteres '*' y '`'
    texto_limpio = text.replace("*", "").replace("`", "")
    
    # 2. Dígito Verificador: DNI... - [0-9Kk]
    control_digit_match = re.search(r'DNI.*?-\s*([0-9Kk])', texto_limpio, re.IGNORECASE)
    control_digit = control_digit_match.group(1).upper() if control_digit_match else None
    
    # 3. Edad: EDAD... (\d+) AÑOS
    edad_match = re.search(r'EDAD.*?(\d+)\s*A[ÑN]OS', texto_limpio, re.IGNORECASE)
    score = int(edad_match.group(1)) if edad_match else None
    
    # 4. Distrito: toma el ÚLTIMO elemento de la lista (domicilio actual)
    distritos = re.findall(r'DISTRITO.*?[➾=>⇒:]\s*([A-Za-z\s]+)', texto_limpio, re.IGNORECASE)
    location = None
    if distritos:
        location = distritos[-1].strip().split('\n')[0].strip().upper()
    
    return control_digit, score, location

def validate_vote_rules(
    input_ticket: str, 
    input_control_digit: str, 
    bot_control_digit: Optional[str], 
    bot_score: Optional[int], 
    bot_location: Optional[str]
) -> Tuple[bool, str]:
    """
    Valida las reglas de negocio para el voto:
    1. Dígito de Control: El dígito ingresado en la web debe coincidir con el extraído por Regex.
    2. Mayoría de Edad: La edad extraída debe ser >= 18.
    3. Filtro de Distrito/Sede: El distrito extraído debe ser "LA PECA".
    """
    
    if not bot_control_digit or bot_score is None or not bot_location:
        return False, "No se pudo extraer toda la información del bot validador."
        
    if str(input_control_digit).upper() != str(bot_control_digit).upper():
        return False, f"El dígito de control no coincide. Esperado: {bot_control_digit}, Ingresado: {input_control_digit}"
        
    if bot_score < 18:
        return False, f"Debes ser mayor de edad para votar. Edad registrada: {bot_score} años."
        
    if bot_location != "LA PECA":
        return False, f"Solo pueden votar residentes del distrito de LA PECA. Tu distrito registrado es: {bot_location}."
        
    return True, "Ticket válido."

