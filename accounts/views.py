from django.shortcuts import render, redirect
from django.contrib import messages
from .models import User


def login_view(request):
    if request.session.get('user_id'):
        return redirect_by_role(request.session.get('user_role'))

    if request.method == 'POST':
        email    = request.POST.get('email')
        password = request.POST.get('password')

        try:
            user = User.objects.get(email=email, is_active=True)

            if user.check_password(password):
                request.session['user_id']   = user.id
                request.session['user_email'] = user.email
                request.session['user_name']  = user.get_full_name()
                request.session['user_role']  = user.role

                return redirect_by_role(user.role)
            else:
                messages.error(request, 'Mot de passe incorrect.')

        except User.DoesNotExist:
            messages.error(request, 'Email introuvable.')

    return render(request, 'registration/login.html')


def logout_view(request):
    request.session.flush()  
    return redirect('login')


def redirect_by_role(role):
    if role == 'ADMIN':
        return redirect('admin_dashboard')
    return redirect('user_dashboard')


