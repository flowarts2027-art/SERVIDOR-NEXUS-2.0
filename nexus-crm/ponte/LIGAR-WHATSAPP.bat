@echo off
chcp 65001 >nul
title Nexus CRM - Ponte do WhatsApp
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao esta instalado. Baixe em https://nodejs.org e instale a versao LTS.
  pause
  exit /b
)
if not exist node_modules (
  echo Instalando pela primeira vez. Aguarde uns minutos...
  call npm install --no-audit --no-fund
)
:loop
node index.js
echo.
echo A ponte parou. Ligando de novo em 5 segundos... (feche a janela para desligar)
timeout /t 5 >nul
goto loop
