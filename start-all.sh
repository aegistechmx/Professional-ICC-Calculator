#!/bin/bash

# Professional ICC Calculator - Script de inicio completo
# Para Linux/macOS

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================${NC}"
echo -e "${BOLD}  PROFESSIONAL ICC CALCULATOR - INICIO COMPLETO${NC}"
echo -e "${CYAN}====================================================${NC}"
echo
echo -e "${GREEN}  Iniciando sistema completo...${NC}"
echo
echo -e "   ${YELLOW}•${NC} Frontend (React/Vite)"
echo -e "   ${YELLOW}•${NC} Backend (Node.js/Express)"
echo
echo -e "${BLUE}Espere mientras los servicios inician...${NC}"
echo

# Verificar directorios
if [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Directorio frontend no encontrado${NC}"
    exit 1
fi

if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Directorio backend no encontrado${NC}"
    exit 1
fi


# Función para verificar si un puerto está en uso
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Puerto en uso
    else
        return 0  # Puerto disponible
    fi
}

# Verificar puertos
FRONTEND_PORT=5173
BACKEND_PORT=3001

if ! check_port $FRONTEND_PORT; then
    echo -e "${YELLOW}⚠️  Puerto $FRONTEND_PORT ya está en uso (frontend)${NC}"
fi

if ! check_port $BACKEND_PORT; then
    echo -e "${YELLOW}⚠️  Puerto $BACKEND_PORT ya está en uso (backend)${NC}"
fi

# Iniciar servicios en background
echo -e "${CYAN}🚀 Iniciando servicios...${NC}"

# Backend
echo -e "${BLUE}Iniciando Backend...${NC}"
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Esperar 2 segundos
sleep 2

# Frontend
echo -e "${BLUE}Iniciando Frontend...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# Esperar 5 segundos para que todo inicie
sleep 5

echo
echo -e "${CYAN}====================================================${NC}"
echo -e "${BOLD}  SERVICIOS INICIADOS${NC}"
echo -e "${CYAN}====================================================${NC}"
echo
echo -e "${GREEN}🌐 Frontend:${NC}    http://localhost:$FRONTEND_PORT"
echo -e "${GREEN}⚙️  Backend:${NC}     http://localhost:$BACKEND_PORT"
echo
echo -e "${YELLOW}📋 Instrucciones:${NC}"
echo -e "   • Presiona Ctrl+C para detener todos los servicios"
echo -e "   • Los procesos corren en background"
echo -e "   • Revisa las URLs arriba para acceder a cada interfaz"
echo

# Abrir navegador (opcional)
if command -v xdg-open > /dev/null; then
    # Linux
    echo -e "${BLUE}Abriendo navegador...${NC}"
    xdg-open http://localhost:$FRONTEND_PORT &
    xdg-open http://localhost:$BACKEND_PORT &
elif command -v open > /dev/null; then
    # macOS
    echo -e "${BLUE}Abriendo navegador...${NC}"
    open http://localhost:$FRONTEND_PORT &
    open http://localhost:$BACKEND_PORT &
fi

# Función para limpieza
cleanup() {
    echo -e "\n${YELLOW}🛑 Deteniendo todos los servicios...${NC}"
    
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${CYAN}   Deteniendo Backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${CYAN}   Deteniendo Frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}✅ Todos los servicios detenidos${NC}"
    exit 0
}

# Capturar señales para limpieza
trap cleanup SIGINT SIGTERM

echo -e "${GREEN}🔄 Sistema en ejecución... (Ctrl+C para detener)${NC}"
echo

# Mantener script corriendo
while true; do
    sleep 1
done
