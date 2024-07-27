# Usar uma imagem base oficial do Node.js
FROM node:20

# Definir o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copiar o package.json e o package-lock.json para o diretório de trabalho
COPY package*.json ./

# Instalar as dependências do projeto
RUN npm install npx

# Instalar o Playwright
RUN npx playwright install

# Instalar dependências do playwright
RUN npx playwright install-deps 

# Copiar o restante do código da aplicação para o diretório de trabalho
COPY . .

# Expor a porta que a aplicação irá rodar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["node", "index.js"]

# Para rodar o container, execute o comando: docker run -p 3000:3000 furg-toolkit-bot mas antes, é necessário carregar a imagem com docker load -i furg-toolkit-bot.tar

