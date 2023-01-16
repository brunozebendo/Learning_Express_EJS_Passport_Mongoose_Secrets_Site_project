/*a intenção do código é criar um site simples para postagem de mensagens,
o site terá uma rota de login e servirá para o estudo de segurança
lembrando que os pacotes instalados estão package.json e que a sintaxe
abaixo é para a inicilização das bibliotecas. Mongoose é o banco de dados.
Comentário importante, o site não estava abrindo, pois estava acessando
a página session32 e dava erro de módulo não encontrado, então,
entrei na pasta Secrets, no terminal, e funcionou
Lembrando que as bibliotecas usadas são: dotenv que é um módulo para lidar com
variáveis de ambiente,express que facilita o NodeJs lidar
com web,bodyParser para lidar com a passagem de informação de html para js,
ejs para gerar JS no HTML, mongoose para reduzir o código e sua representação
do MongoDB para o servidor Node.js, também o módulo encrypt para lidar com encriptação.
A encriptação foi depois substituida pelo hashing, através do módulo md5, que também
foi substituido pelo módulo bcrypt, que usa o método salt e hashing para encriptar,
tornando mais seguro. O saltrounds é a quantidade de códigos aleatórios que serão
gerados para aumentar a segurança da senha, recomenda-se 10 saltos, pois, mais que
isso, demora muito o processamento do computador. Depois o bcrypt também foi comentado
para dar espaço ao passport, pelo que entendi, o passport serve lidar com diferentes tipos
de logins.
O express-session lida com cookies.
O GoogleStrategy é uma exigência da estratégia do Passport para lidar com o Oauth
do google, ou seja, para trabalhar com as informações do cliente passadas pelo Google
através do Gmail, para que o cliente possa fazer a autenticação através do login with Gmail.
Para isso foi preciso autorizar o site secrets no Google API para que ele criasse
um usuário e uma chave, que estão salvos na aba .env
O pacote findOrCreate é um pacote do mongoose para procurar um usuário e se não
encontrar um, criá-lo
*/
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption")
//const md5 = require("md5")
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-Local-Mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findOrCreate')

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended:true
}));
/*aqui a sintaxe de configuração do express-session. A ordem desses comandos
no código, importa. A explicação para cada campo está na documentação,
npm express-session*/
app.use(session({
  secret: "mulamanca.",
  resave: false,
  saveUnitialized: true
}));
/*aqui o código de inicilização do passport e o código para que o passport lide
com o session*/
app.use(passport.initialize());
app.use(passport.session());


/*abaixo o código para inicialização do DB, sendo 27017 o endereço padrão,
userDB o nome dado, e useNewUrlParser para retirar um alerta de erro. lembrando
que é preciso abrir uma nova janela do Terminal e rodar o comando mongosh para
que o banco de dados seja ativado*/
mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

/*abaixo a sintaxe para criar os campos do banco de dados, já dentro do esquema
do Mongoose, o que é uma exigência do encrypt. Depois, foi adicionado
o campo googleId para adicionar do DB a informação obtida no login pelo
google, contudo, a informação da senha não vem.*/
const userSchema = new mongoose.Schema( {
    email: String,
    password: String,
    googleId: String

}) ;
/*o plugin abaixo é o que se usa para o hash e o salt o password do DB e o
segundo o plugin para a função e achar o usuário e se não existir, criar um*/
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


/*as linhas abaixo são um modo de ativar o módulo encrypt, consiste em passar
uma frase como segredo, depois o plugin da função encrypt vai encriptar o banco
de dados de nome userSchema, mas como foi passada a variável encryptedFields
vai ser só o campo ali descrito. Essa sintaxe tem que vir
antes da crianção do DB. Uma informação extra é que o plugin é usado nas funções
do Mongoose para dar atribuições extras. Essa linha secret: process.env.SECRET
acessa a aba da variável de ambiente, deixando assim a informação oculta no código
principal. A explicação completa sobre variáveis de ambiente a instalação no código
está no material extra. A linha está comentada pois depois foi substituida pelo
hashing */

//userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

//abaixo a sintaxe para a criação do usuário do banco de dados
const User = new mongoose.model("User", userSchema);
/*já as 3 linhas abaixo são a sintaxe para o passport lidar com a serialização
e deserialização dos cookies, que são as informações da sessão, passadas para o site.
Se não estive usando o mongoose model, a sintaxe seria diferente. Depois, duas
das linhas foram comentadas, pois estava dando erro por ser um método apenas
para serialização local e trocado por um método do passport que permite a serialização
mais geral*/

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err,user);
  });
});

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
/*o código abaixo é a sintaxe exigida pelo módulo passport para lidar com a
autenticação pelo Gmail. Prestar atenção na ordem do código para que, por exemplo,
esse código de autenticação não venha antes da inicialização da sessão do usuário.
As informações sensíveis, aqui passadas, estão na aba env (são variáveis de ambiente),
a callbackURL é a rota de autenticação passada no GoogleApi. Já o userProfileURL
é para não dar erro pela depreciação do Google+, mas não sei se é necessário.
Se tudo der certo, o Google vai retornar um token, que garante o acesso a autenticação
por um período mais longo que o auth, que só fica salvo durante a sessão, o profile
que são as informações de email, id do usuário e  */
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENTE_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    //userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
//as rotas para acessar as páginas com o get e a rota para submeter algo, com post
//reparar que não há um rota para secrets, porque o usuário só pode acessá-la
//se estiver logado
app.get("/", function(req, res){
  res.render("home");
});
/*a rota abaixo vai ser usada para a autenticação pelo google, usando o passport
para o método authenticate, acima instanciado no GoogleStrategy, usando o
atributo google e trazendo as informações do profile do usuário. Essa sintaxe foi
retirada da documentação do passport*/
app.get("/auth/google",
  passport.authenticate("google", {scope: ['profile'] })
);
/*já essa parte é a resposta para depois que o usuário for autenticado*/
app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

/*a rota para garantir o acesso a página secrets a todos os usuários, não
somente os autenticados, apesar de só os autenticados poderem postar. A lógica
é que dentro do banco de dados User seja localizado o campo secret e ele seja
mostrado na página, desde que ele não seja igual a nulo, ou seja, not equal: null.
Pois é possível que haja um usuário no DB sem segredos publicados.
Reparar nas chaves e no $ para o código funcionar.
Assim, o if loga o erro, se houver, e o else, se encontrar usuários com segredos
vai redirecionar para a rota secrets, e a variável usersWithSecrets vai guardar
os usuários como o seu valor. Essa parte do código trabalha junto com o secrets.ejs
que vai iterar pelo dicionário usersWithSecrets e vai exibir toda a informação
ali guardada */
app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUser) {
        res.render("secrets", {usersWithSecrets: foundUsers})
      }
    }
  });
});
/*abaixo a rota para o usuário submeter o seu post, caso ele esteja autenticado*/
app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
  });
/*abaixo, a rota para lidar com a botão de submit, para postar o que foi escrito,
para isso ele está usando o que for escrito no campo secret, que está na aba submit.ejs.
Depois, a função findById do passport vai achar o usuário pelo id logado, se
der erro, vai logar o erro no console, se não, e se achar o usuário, vai guardar
o secredo e vai salvar e redirecionar no banco de dados */
  app.post("/submit", function(req, res){
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function(err, foundUser){
      if (err){
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          })
        }
      }
    });
  });



/*a função logout também é uma função interna do passport*/
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});
/*abaixo, o código para lidar com a rota de registro do novo usuário, o
passportLocalMongoose lida com as funções de registro, ele fica no meio entre
o passport e o mongoose, por isso não precisou ser criada toda a função como no
código abaixo comentado. local é o tipo de autentticação que está sendo usada*/
app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err,user){
      if(err){
        console.log(err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        })
      }
    })
})

/*a rota abaixo usa o método login do passport*/
app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if (err){
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
  });
 }
});
});

/*a rota abaixo vai criar um novo usuário de acordo com as informações passadas
na rota register, nos campos com o nome username e password. Já o save
vai salvar o usuário no db, lidar com o erro, se houver, ou voltar para a rota,
se não houver. Depois o código foi atualizado para usar o método hashing, através
do módulo md5, que depois foi substituida pelo bcrypt.hash passando os parâmetros
o campo do password, o número de saltos que foi criado acima e a função. Por fim,
comentei o código inteiro, pois ele foi refatorado, usando o passport*/
// app.post("/register", function(req, res){
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     })
//     newUser.save(function(err){
//       if (err){
//         console.log(err);
//       } else {
//         res.render("secrets");
//       }
//     });
//   })
// });
/*o código abaixo vai lidar com a rota do login para verificar através das
informações inseridas no login, se o usuário consta no database,
por isso foi usado o método findOne, se constar, verificar se o password é
igual, se for, vai para a rota secrets. Depois o código foi atualizado para
incorporar o método compare, que vai ser usado para comparar a senha
usada no login, com a senha guardada no Db, na documentação os atributos
da função são err, res, mas aqui foi mudado para result, para não conflitar com
o res de cima. Por fim, comentei o código inteiro, pois ele foi refatorado,
usando o passport */
// app.post("/login", function(req, res){
//   const username = req.body.username;
//   const password = req.body.password;
//
//   User.findOne({email:username}, function(err, foundUser){
//     if(err){
//       console.log(err);
//     } else{
//       if(foundUser) {
//         bcrypt.compare(password, foundUser.password, function(err, result){
//           if (result === true){
//               res.render("secrets");
//           }
//         });
//       }
//     }
//   })
// })






app.listen(3000, function(){
  console.log("Server started on port 3000");
});
