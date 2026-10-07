FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
COPY redirects.conf /etc/nginx/snippets/redirects.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
