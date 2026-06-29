@echo off
echo ========================================
echo  CAR-MT - Deploy Automatico para Vercel
echo ========================================
echo.

:: Verifica se existe mensagem de commit
set MENSAGEM=%~1
if "%MENSAGEM%"=="" set MENSAGEM=Atualizacao automatica

echo [1/3] Adicionando arquivos alterados...
git add .

echo [2/3] Fazendo commit: "%MENSAGEM%"
git commit -m "%MENSAGEM%"

echo [3/3] Enviando para GitHub (Vercel fara deploy automaticamente)...
git push

echo.
echo ========================================
echo  Pronto! Aguarde ~1 minuto e acesse:
echo  https://carplus-mt.vercel.app
echo ========================================
pause
