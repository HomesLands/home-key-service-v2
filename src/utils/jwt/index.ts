import * as JWT from 'jsonwebtoken';

export default {
    signToken: (id, provider) => {
        return JWT.sign({
            iss: 'ApiAuth',
            id,
            provider,
            iat: new Date().getTime(),
            exp: new Date().setDate(new Date().getDate()) + 3 // 3 days
        },
            process.env.JWT_SECRET
        )
    }
}