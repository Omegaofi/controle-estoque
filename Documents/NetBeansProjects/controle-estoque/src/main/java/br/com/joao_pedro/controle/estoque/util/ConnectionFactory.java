package br.com.joao_pedro.controle.estoque.util;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class ConnectionFactory {
    
    public static Connection getConnection() throws SQLException {
        String url = "jdbc:mysql://localhost:3306/estoque_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String user = "root";
        String password = "";
        
        return DriverManager.getConnection(url, user, password);
    }
}